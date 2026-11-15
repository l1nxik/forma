use tauri::{
    menu::{Menu, PredefinedMenuItem, Submenu},
    AppHandle,
};
fn text(language: &str, en: &'static str, ru: &'static str) -> &'static str {
    if language == "ru" {
        ru
    } else {
        en
    }
}
pub fn install(app: &AppHandle, language: &str) -> tauri::Result<()> {
    let application = Submenu::new(app, "Forma", true)?;
    application.append(&PredefinedMenuItem::about(
        app,
        Some(text(language, "About Forma", "О Forma")),
        None,
    )?)?;
    application.append(&PredefinedMenuItem::separator(app)?)?;
    #[cfg(target_os = "macos")]
    application.append(&PredefinedMenuItem::hide(
        app,
        Some(text(language, "Hide Forma", "Скрыть Forma")),
    )?)?;
    application.append(&PredefinedMenuItem::quit(
        app,
        Some(text(language, "Quit Forma", "Завершить Forma")),
    )?)?;
    let menu = Menu::with_items(
        app,
        &[
            &application,
            &Submenu::with_items(
                app,
                text(language, "Edit", "Правка"),
                true,
                &[
                    &PredefinedMenuItem::undo(app, Some(text(language, "Undo", "Отменить")))?,
                    &PredefinedMenuItem::redo(app, Some(text(language, "Redo", "Повторить")))?,
                    &PredefinedMenuItem::separator(app)?,
                    &PredefinedMenuItem::cut(app, Some(text(language, "Cut", "Вырезать")))?,
                    &PredefinedMenuItem::copy(app, Some(text(language, "Copy", "Копировать")))?,
                    &PredefinedMenuItem::paste(app, Some(text(language, "Paste", "Вставить")))?,
                    &PredefinedMenuItem::select_all(
                        app,
                        Some(text(language, "Select All", "Выбрать всё")),
                    )?,
                ],
            )?,
            &Submenu::with_items(
                app,
                text(language, "Window", "Окно"),
                true,
                &[
                    &PredefinedMenuItem::minimize(
                        app,
                        Some(text(language, "Minimize", "Свернуть")),
                    )?,
                    &PredefinedMenuItem::maximize(
                        app,
                        Some(text(language, "Zoom", "Масштабировать")),
                    )?,
                ],
            )?,
        ],
    );
    app.set_menu(menu?)?;
    Ok(())
}
#[tauri::command]
pub async fn set_language(app: AppHandle, language: String) -> Result<(), String> {
    if language != "en" && language != "ru" {
        return Err("settings.invalid".into());
    }
    tauri::async_runtime::spawn_blocking(move || {
        install(&app, &language).map_err(|e| e.to_string())
    })
    .await
    .map_err(|e| e.to_string())?
}
