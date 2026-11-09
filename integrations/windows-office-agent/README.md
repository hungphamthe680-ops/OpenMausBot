# OpenMausBot Windows Office Agent (local MCP)

This is the **document/data layer** for a Windows desktop agent. It connects through OpenMausBot's existing **Plugins → MCP servers** feature. It does not replace the built-in CUA Driver: CUA remains responsible for screen observation, clicking, typing, shortcuts and dialog interaction; this MCP server handles bounded file search and deterministic document operations.

## Architecture

```text
OpenMausBot chat / selected bot
          |
          v
Existing harness + permission broker + MCP registry
          |                                |
          |                                +--> Existing CUA Driver MCP
          |                                     (window state, click, type, keys)
          |
          +--> Windows Office Agent MCP (stdio, local subprocess)
                    |
                    +--> PDF text inspection (pypdf)
                    +--> DOCX inspection/template filling (python-docx)
                    +--> XLSX/XLSM inspection/copy updates (openpyxl)
                    +--> Word-to-PDF export (Microsoft Word COM, optional)
                    +--> Open file in default Windows app
                    |
                    +--> OMB_AGENT_ALLOWED_ROOTS only
```

**Routing rule:** use the file tools for searching, reading, extracting, creating a new copy and exporting. Use CUA only when a real GUI step is required (reviewing a document, interacting with a legacy application or completing a print dialog). Do not use both to write the same file in one task.

## Safety boundaries

- No network calls are made by this service.
- It can see only directories listed in `OMB_AGENT_ALLOWED_ROOTS` (semicolon-separated absolute paths). When unset, only `%USERPROFILE%\Documents\OpenMausBot-Agent` is used.
- Reads and writes resolve symlinks and verify the canonical path remains inside an approved root.
- The service never deletes files, never overwrites existing outputs and never edits the source document/workbook. Generated files must use a new filename.
- Large files, search results, page counts, rows, sheets and text previews are capped.
- Macro-enabled workbooks are preserved as `.xlsm`; macros are not executed. Word automation disables VBA/AutoOpen macros before exporting to PDF.
- Printing is intentionally not exposed as a direct tool. Ask the user to review and approve the final document, open it, then use CUA to operate the print dialog. This keeps the final irreversible action visible.
- Logs go to stderr and should contain operational metadata only, not document contents or credentials.

These controls reduce accidental access; they do not replace Windows account permissions, antivirus, backups or OpenMausBot's own MCP/tool approval settings.

## Requirements

- Windows 10/11 x64.
- Python 3.11 or newer.
- OpenMausBot installed locally, with its existing CUA capability available for GUI steps.
- Microsoft Word desktop is optional and required only for `export_word_to_pdf`.

## Install

1. Extract this folder to a stable local path, for example `D:\AI-Lab\OpenMausBot\integrations\windows-office-agent`.
2. Open PowerShell in this folder and run:

   ```powershell
   Set-ExecutionPolicy -Scope Process Bypass
   .\setup.ps1
   ```

3. Setup creates `.venv` and `%USERPROFILE%\Documents\OpenMausBot-Agent`. Copy working documents into that folder for the first test. Grant additional roots later; do not grant the entire `C:\` drive or Windows/system folders.

## Connect in OpenMausBot

1. Open **Plugins → MCP servers → Add server → Run a command**.
2. Command: the absolute path to `.venv\Scripts\python.exe` inside this folder.
3. Add one argument: the absolute path to `server.py` in this folder.
4. Add environment variable `OMB_AGENT_ALLOWED_ROOTS` with the exact folder(s) to grant. Separate multiple paths with `; ` only when that separator is not part of the path; normally use `; ` without spaces.
5. Save and wait for MCP handshake/tool discovery to report Connected.

Example (replace paths with yours):

```text
Command: D:\AI-Lab\OpenMausBot\integrations\windows-office-agent\.venv\Scripts\python.exe
Argument: D:\AI-Lab\OpenMausBot\integrations\windows-office-agent\server.py
OMB_AGENT_ALLOWED_ROOTS=C:\Users\AdminPC\Documents\OpenMausBot-Agent;D:\DuAn\HoSoHopDong
```

The MCP entry stores its environment with the local server configuration. Keep allowed roots narrow. Remove a root from that variable to revoke its access.

## Available tools

| Tool | Purpose | Write behavior |
|---|---|---|
| `list_allowed_roots` | Show folders explicitly granted by the user | Read only |
| `find_files` | Search filenames in approved roots | Read only |
| `inspect_document` | Extract bounded text/preview from PDF, DOCX, XLSX, XLSM, CSV, TXT, MD, JSON | Read only |
| `create_docx_from_template` | Replace `{{PLACEHOLDER}}` values in a DOCX template | Creates a new DOCX; source is preserved |
| `update_workbook_copy` | Apply cell updates to XLSX/XLSM | Creates a new workbook; source is preserved |
| `export_word_to_pdf` | Export DOC/DOCX through installed Word | Creates a new PDF; source is preserved |
| `open_file` | Open an approved file in its Windows default application | Opens UI only |

DOCX placeholders should appear entirely within one Word text run (for example `{{HO_TEN}}`). If a placeholder was split by Word formatting into multiple runs, the operation refuses rather than silently damaging formatting.

### Excel compatibility note

The workbook writer uses `openpyxl`: it preserves ordinary cell values, formulas, styles and VBA payloads in `.xlsm`, but it does not run Excel or recalculate formulas. Formula results refresh when the workbook is opened in Excel. Advanced workbook components such as some pivot caches, slicers, embedded OLE objects, Power Query connections and unsupported chart extensions may not round-trip perfectly. For a workbook that relies on those features, use the Agent to inspect it and then use the existing CUA/Excel UI for edits, or keep the original untouched and review the generated copy carefully before relying on it.

## Suggested operating pattern

1. **Read:** find the source file and inspect it. Show the file path and a short summary to the user.
2. **Plan:** state what will be created/changed and the destination path.
3. **Write:** create a new DOCX/workbook/PDF in an approved folder; do not replace the original.
4. **Review:** open the result and use existing CUA to inspect layout. For printing, obtain a separate explicit confirmation before interacting with the print dialog.
5. **Close out:** report created paths, source files left untouched and any fields that could not be extracted or verified.

## Test

After setup:

```powershell
.\.venv\Scripts\python.exe -m unittest -v test_office_ops.py
```

Then add the server in OpenMausBot and confirm it reports seven tools. Start with `list_allowed_roots`, `find_files` against a sample folder and `inspect_document` against a copied sample PDF/DOCX/XLSX before using real customer records.
