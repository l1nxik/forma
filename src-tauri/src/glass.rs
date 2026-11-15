//! The sidebar's material is drawn by AppKit, beneath the transparent webview.
//! Only its geometry crosses IPC; task content and controls remain in React.
use serde::Deserialize;

#[derive(Clone, Deserialize)]
pub struct GlassFrame {
    x: f64,
    y: f64,
    width: f64,
    height: f64,
}

#[tauri::command]
pub async fn set_sidebar_glass(
    window: tauri::WebviewWindow,
    frame: Option<GlassFrame>,
) -> Result<bool, String> {
    if let Some(ref rect) = frame {
        if ![rect.x, rect.y, rect.width, rect.height]
            .iter()
            .all(|v| v.is_finite() && *v >= 0.0 && *v <= 16384.0)
        {
            return Err("Invalid sidebar bounds".into());
        }
    }
    #[cfg(target_os = "macos")]
    {
        let (sender, receiver) = std::sync::mpsc::channel();
        window
            .with_webview(move |webview| {
                // Tauri runs this closure on the main thread and owns the WKWebView
                // for the entire call. AppKit owns the inserted view afterwards.
                let applied = unsafe { macos::update(webview.inner().cast(), frame) };
                let _ = sender.send(applied);
            })
            .map_err(|error| error.to_string())?;
        tauri::async_runtime::spawn_blocking(move || {
            receiver
                .recv_timeout(std::time::Duration::from_secs(2))
                .map_err(|error| error.to_string())
        })
        .await
        .map_err(|error| error.to_string())?
    }
    #[cfg(not(target_os = "macos"))]
    {
        let _ = (window, frame);
        Ok(false)
    }
}

#[cfg(target_os = "macos")]
mod macos {
    use super::GlassFrame;
    use objc2::{rc::Retained, MainThreadMarker};
    use objc2_app_kit::{
        NSAppKitVersionNumber, NSGlassEffectView, NSGlassEffectViewStyle, NSView,
        NSWindowOrderingMode,
    };
    use objc2_foundation::{NSPoint, NSRect, NSSize};
    use std::cell::RefCell;

    thread_local! {
        static SIDEBAR: RefCell<Option<Retained<NSGlassEffectView>>> = const { RefCell::new(None) };
    }

    pub unsafe fn update(webview: *mut NSView, frame: Option<GlassFrame>) -> bool {
        // NSGlassEffectView was introduced in macOS 26. Older systems use the
        // opaque CSS fallback, without ever touching this unavailable class.
        if NSAppKitVersionNumber < 2685.0 {
            return false;
        }
        let Some(mtm) = MainThreadMarker::new() else {
            return false;
        };
        let webview = &*webview;
        let Some(parent) = webview.superview() else {
            return false;
        };
        SIDEBAR.with_borrow_mut(|stored| {
            let Some(rect) = frame else {
                if let Some(view) = stored.take() {
                    view.removeFromSuperview();
                }
                return true;
            };
            let y = if webview.isFlipped() {
                rect.y
            } else {
                webview.bounds().size.height - rect.y - rect.height
            };
            let bounds = webview.convertRect_toView(
                NSRect::new(
                    NSPoint::new(rect.x, y),
                    NSSize::new(rect.width, rect.height),
                ),
                Some(&parent),
            );
            let view = stored.get_or_insert_with(|| {
                let view = NSGlassEffectView::initWithFrame(mtm.alloc(), bounds);
                view.setStyle(NSGlassEffectViewStyle::Regular);
                // The sidebar joins the content pane. The rounded outer frame is
                // painted by React; rounding this inner material exposes backing pixels.
                view.setCornerRadius(0.0);
                parent.addSubview_positioned_relativeTo(
                    &view,
                    NSWindowOrderingMode::Below,
                    Some(webview),
                );
                view
            });
            view.setFrame(bounds);
            true
        })
    }
}
