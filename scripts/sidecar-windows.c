// Keep Java in a job so terminating the desktop sidecar cannot orphan it.
// Use wide paths and pass only the three standard handles to the child.
#define _WIN32_WINNT 0x0601
#include <windows.h>
#include <stdio.h>
#include <stdlib.h>
#include <wchar.h>

int wmain(void) {
    wchar_t *home = NULL;
    size_t home_size = 0;
    if (_wdupenv_s(&home, &home_size, L"FORMA_BACKEND_HOME") || !home || !*home) {
        fputs("Missing FORMA_BACKEND_HOME\n", stderr);
        free(home);
        return 1;
    }
    size_t capacity = home_size * 2 + 512;
    wchar_t *java = calloc(capacity, sizeof(wchar_t));
    wchar_t *command = calloc(capacity, sizeof(wchar_t));
    HANDLE handles[3] = {NULL, NULL, NULL};
    HANDLE job = NULL;
    LPPROC_THREAD_ATTRIBUTE_LIST attributes = NULL;
    PROCESS_INFORMATION process = {0};
    int result = 1;
    if (!java || !command) goto cleanup;
    swprintf_s(java, capacity, L"%ls\\runtime\\bin\\java.exe", home);
    swprintf_s(command, capacity,
        L"\"%ls\" -Xms32m -Xmx256m -XX:+UseSerialGC "
        L"--enable-native-access=ALL-UNNAMED -jar \"%ls\\forma-backend.jar\"", java, home);

    DWORD streams[] = {STD_INPUT_HANDLE, STD_OUTPUT_HANDLE, STD_ERROR_HANDLE};
    for (int i = 0; i < 3; ++i) {
        if (!DuplicateHandle(GetCurrentProcess(), GetStdHandle(streams[i]),
                GetCurrentProcess(), &handles[i], 0, TRUE, DUPLICATE_SAME_ACCESS)) goto cleanup;
    }
    SIZE_T attribute_size = 0;
    InitializeProcThreadAttributeList(NULL, 1, 0, &attribute_size);
    attributes = HeapAlloc(GetProcessHeap(), 0, attribute_size);
    if (!attributes) goto cleanup;
    if (!InitializeProcThreadAttributeList(attributes, 1, 0, &attribute_size)) {
        HeapFree(GetProcessHeap(), 0, attributes);
        attributes = NULL;
        goto cleanup;
    }
    if (!UpdateProcThreadAttribute(attributes, 0, PROC_THREAD_ATTRIBUTE_HANDLE_LIST,
            handles, sizeof(handles), NULL, NULL)) goto cleanup;

    job = CreateJobObjectW(NULL, NULL);
    if (!job) goto cleanup;
    JOBOBJECT_EXTENDED_LIMIT_INFORMATION limits = {0};
    limits.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;
    if (!SetInformationJobObject(job, JobObjectExtendedLimitInformation,
            &limits, sizeof(limits))) goto cleanup;

    STARTUPINFOEXW startup = {0};
    startup.StartupInfo.cb = sizeof(startup);
    startup.StartupInfo.dwFlags = STARTF_USESTDHANDLES;
    startup.StartupInfo.hStdInput = handles[0];
    startup.StartupInfo.hStdOutput = handles[1];
    startup.StartupInfo.hStdError = handles[2];
    startup.lpAttributeList = attributes;
    if (!CreateProcessW(java, command, NULL, NULL, TRUE,
            CREATE_NO_WINDOW | CREATE_SUSPENDED | EXTENDED_STARTUPINFO_PRESENT,
            NULL, NULL, &startup.StartupInfo, &process)) goto cleanup;
    if (!AssignProcessToJobObject(job, process.hProcess)) goto cleanup;
    if (ResumeThread(process.hThread) == (DWORD)-1) goto cleanup;
    if (WaitForSingleObject(process.hProcess, INFINITE) != WAIT_OBJECT_0) goto cleanup;
    DWORD exit_code = 1;
    if (GetExitCodeProcess(process.hProcess, &exit_code)) result = (int)exit_code;

cleanup:
    if (result != 0) {
        fprintf(stderr, "Backend launcher failed (Windows error %lu)\n", GetLastError());
        if (process.hProcess) TerminateProcess(process.hProcess, 1);
    }
    if (process.hThread) CloseHandle(process.hThread);
    if (process.hProcess) CloseHandle(process.hProcess);
    if (job) CloseHandle(job);
    if (attributes) {
        DeleteProcThreadAttributeList(attributes);
        HeapFree(GetProcessHeap(), 0, attributes);
    }
    for (int i = 0; i < 3; ++i) if (handles[i]) CloseHandle(handles[i]);
    free(java);
    free(command);
    free(home);
    return result;
}
