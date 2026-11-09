"""Local, workspace-scoped document operations for OpenMausBot.

This module makes no network requests. It confines reads and writes to roots
explicitly granted via OMB_AGENT_ALLOWED_ROOTS and never overwrites a source.
"""
from __future__ import annotations

import csv
import fnmatch
import json
import os
import re
from pathlib import Path
from typing import Any

MAX_FILE_BYTES = 20 * 1024 * 1024
MAX_TEXT_CHARS = 45_000
MAX_SEARCH_RESULTS = 200
SKIP_DIRS = {
    ".git", ".venv", "venv", "node_modules", "__pycache__", "$recycle.bin",
    "system volume information", "windows", "program files", "program files (x86)",
}
SUPPORTED_DOCS = {".pdf", ".docx", ".xlsx", ".xlsm", ".csv", ".tsv", ".txt", ".md", ".json"}


def _roots() -> list[Path]:
    raw = os.environ.get("OMB_AGENT_ALLOWED_ROOTS", "").strip()
    if not raw:
        default = Path.home() / "Documents" / "OpenMausBot-Agent"
        default.mkdir(parents=True, exist_ok=True)
        raw_paths = [str(default)]
    else:
        raw_paths = [item.strip().strip('"') for item in raw.split(";") if item.strip()]

    roots: list[Path] = []
    for item in raw_paths:
        candidate = Path(item).expanduser()
        if not candidate.is_absolute():
            raise ValueError("Mọi thư mục được cấp quyền phải dùng đường dẫn tuyệt đối.")
        candidate.mkdir(parents=True, exist_ok=True)
        canonical = candidate.resolve(strict=True)
        if not canonical.is_dir():
            raise ValueError(f"Thư mục được cấp quyền không hợp lệ: {item}")
        if canonical not in roots:
            roots.append(canonical)
    if not roots:
        raise ValueError("Chưa cấp thư mục làm việc cho AI. Hãy đặt OMB_AGENT_ALLOWED_ROOTS.")
    return roots


def _inside(path: Path, root: Path) -> bool:
    try:
        path.relative_to(root)
        return True
    except ValueError:
        return False


def _resolve_read(raw_path: str) -> Path:
    if not raw_path or not raw_path.strip():
        raise ValueError("Thiếu đường dẫn file.")
    candidate = Path(raw_path).expanduser()
    if not candidate.is_absolute():
        raise ValueError("Hãy dùng đường dẫn đầy đủ trả về từ công cụ tìm file.")
    resolved = candidate.resolve(strict=True)
    if not any(_inside(resolved, root) for root in _roots()):
        raise PermissionError("Từ chối truy cập: file nằm ngoài các thư mục đã cấp quyền.")
    if not resolved.is_file():
        raise ValueError("Đường dẫn không trỏ tới một file.")
    if resolved.stat().st_size > MAX_FILE_BYTES:
        raise ValueError(f"File vượt quá giới hạn {MAX_FILE_BYTES // (1024 * 1024)} MB.")
    return resolved


def _resolve_new_output(raw_path: str) -> Path:
    if not raw_path or not raw_path.strip():
        raise ValueError("Thiếu đường dẫn file đầu ra.")
    candidate = Path(raw_path).expanduser()
    if not candidate.is_absolute():
        raise ValueError("Đường dẫn đầu ra phải là đường dẫn tuyệt đối trong thư mục đã cấp quyền.")
    parent = candidate.parent.resolve(strict=True)
    if not any(_inside(parent, root) for root in _roots()):
        raise PermissionError("Từ chối ghi: thư mục đầu ra nằm ngoài vùng đã cấp quyền.")
    output = parent / candidate.name
    if output.exists() or output.is_symlink():
        raise FileExistsError("File hoặc liên kết đầu ra đã tồn tại. Không ghi đè; hãy chọn tên file mới.")
    if output.name in {"", ".", ".."}:
        raise ValueError("Tên file đầu ra không hợp lệ.")
    return output


def list_allowed_roots() -> str:
    return json.dumps([{"root_id": str(i), "path": str(path)} for i, path in enumerate(_roots())], ensure_ascii=False)


def find_files(query: str, root_id: str = "", pattern: str = "*", max_results: int = 50) -> str:
    needle = (query or "").strip().casefold()
    if not needle:
        raise ValueError("Nhập ít nhất một từ khóa để tìm file.")
    if not 1 <= max_results <= MAX_SEARCH_RESULTS:
        raise ValueError(f"max_results phải từ 1 đến {MAX_SEARCH_RESULTS}.")
    roots = _roots()
    selected = roots
    if root_id:
        if not root_id.isdigit() or int(root_id) >= len(roots):
            raise ValueError("root_id không hợp lệ. Hãy gọi list_allowed_roots trước.")
        selected = [roots[int(root_id)]]

    found: list[dict[str, Any]] = []
    visited_dirs = 0
    for root in selected:
        for current, dirs, files in os.walk(root, followlinks=False):
            visited_dirs += 1
            if visited_dirs > 30_000:
                break
            dirs[:] = [d for d in dirs if not d.startswith(".") and d.casefold() not in SKIP_DIRS
                       and not (Path(current) / d).is_symlink()]
            for name in files:
                if name.startswith(".") or needle not in name.casefold() or not fnmatch.fnmatch(name, pattern):
                    continue
                full = Path(current) / name
                try:
                    resolved = full.resolve(strict=True)
                    if not _inside(resolved, root) or not resolved.is_file():
                        continue
                    info = resolved.stat()
                    found.append({"name": name, "path": str(resolved), "bytes": info.st_size,
                                  "extension": resolved.suffix.lower()})
                except OSError:
                    continue
                if len(found) >= max_results:
                    break
            if len(found) >= max_results:
                break
        if len(found) >= max_results:
            break
    return json.dumps({"results": found, "count": len(found), "limited": len(found) >= max_results}, ensure_ascii=False)


def _trim(text: str) -> str:
    return text[:MAX_TEXT_CHARS] + ("\n...[đã cắt bớt nội dung]" if len(text) > MAX_TEXT_CHARS else "")


def inspect_document(raw_path: str) -> str:
    path = _resolve_read(raw_path)
    suffix = path.suffix.lower()
    if suffix not in SUPPORTED_DOCS:
        raise ValueError(f"Chưa hỗ trợ định dạng {suffix or '(không có phần mở rộng)'}.")
    result: dict[str, Any] = {"name": path.name, "path": str(path), "bytes": path.stat().st_size, "type": suffix}
    if suffix == ".pdf":
        from pypdf import PdfReader
        reader = PdfReader(str(path), strict=False)
        if reader.is_encrypted:
            raise ValueError("PDF đang được mã hóa hoặc đặt mật khẩu; không tự tìm cách vượt mật khẩu.")
        pages = [{"page": index + 1, "text": _trim(page.extract_text() or "")}
                 for index, page in enumerate(reader.pages[:100])]
        result.update({"page_count": len(reader.pages), "pages_returned": len(pages), "pages": pages})
    elif suffix == ".docx":
        from docx import Document
        doc = Document(str(path))
        blocks: list[str] = [p.text for p in doc.paragraphs if p.text.strip()]
        for table_index, table in enumerate(doc.tables, start=1):
            blocks.append(f"[Bảng {table_index}]")
            for row in table.rows[:100]:
                blocks.append(" | ".join(cell.text.replace("\n", " / ") for cell in row.cells))
        for section in doc.sections:
            for p in section.header.paragraphs:
                if p.text.strip():
                    blocks.append("[Header] " + p.text)
            for p in section.footer.paragraphs:
                if p.text.strip():
                    blocks.append("[Footer] " + p.text)
        result["text"] = _trim("\n".join(blocks))
    elif suffix in {".xlsx", ".xlsm"}:
        from openpyxl import load_workbook
        workbook = load_workbook(path, read_only=True, data_only=True, keep_vba=(suffix == ".xlsm"))
        sheets = []
        for sheet in workbook.worksheets[:20]:
            rows = []
            for row in sheet.iter_rows(min_row=1, max_row=100, max_col=30, values_only=True):
                values = ["" if value is None else str(value) for value in row]
                if any(values):
                    rows.append(values)
            sheets.append({"sheet": sheet.title, "rows_preview": rows})
        workbook.close()
        result["sheets"] = sheets
    elif suffix in {".csv", ".tsv"}:
        delimiter = "\t" if suffix == ".tsv" else ","
        with path.open("r", encoding="utf-8-sig", newline="") as handle:
            result["rows_preview"] = list(csv.reader(handle, delimiter=delimiter))[:200]
    else:
        result["text"] = _trim(path.read_text(encoding="utf-8-sig", errors="replace"))
    return json.dumps(result, ensure_ascii=False)


def _cell_paragraphs(cell: Any):
    yield from cell.paragraphs
    for table in cell.tables:
        for row in table.rows:
            for nested in row.cells:
                yield from _cell_paragraphs(nested)


def _all_paragraphs(document: Any):
    for paragraph in document.paragraphs:
        yield paragraph
    for table in document.tables:
        for row in table.rows:
            for cell in row.cells:
                yield from _cell_paragraphs(cell)
    for section in document.sections:
        for part in (section.header, section.footer, section.first_page_header, section.first_page_footer):
            for paragraph in part.paragraphs:
                yield paragraph
            for table in part.tables:
                for row in table.rows:
                    for cell in row.cells:
                        yield from _cell_paragraphs(cell)


def _replace_runs(paragraph: Any, replacements: dict[str, str]) -> dict[str, int]:
    runs = paragraph.runs
    joined = "".join(run.text for run in runs)
    if not joined:
        return {token: 0 for token in replacements}
    for token in replacements:
        if token in joined and not any(token in run.text for run in runs):
            raise ValueError(f"Placeholder {token} bị chia qua nhiều run trong Word. Hãy đặt token liền mạch trong mẫu.")
    counts = {token: 0 for token in replacements}
    for run in runs:
        for token, value in replacements.items():
            occurrences = run.text.count(token)
            if occurrences:
                run.text = run.text.replace(token, value)
                counts[token] += occurrences
    return counts


def create_docx_from_template(template_path: str, output_path: str, replacements: dict[str, str]) -> str:
    source = _resolve_read(template_path)
    if source.suffix.lower() != ".docx":
        raise ValueError("Mẫu đầu vào phải là .docx. Không tự chuyển đổi file .doc cũ.")
    if not replacements or len(replacements) > 100:
        raise ValueError("Cần từ 1 đến 100 cặp placeholder và giá trị thay thế.")
    for token, value in replacements.items():
        if not re.fullmatch(r"\{\{[A-Z0-9_]{1,80}\}\}", token):
            raise ValueError(f"Placeholder không hợp lệ: {token}. Dùng dạng {{{{TEN_TRUONG}}}} không có khoảng trắng.")
        if not isinstance(value, str) or len(value) > 10_000:
            raise ValueError(f"Giá trị thay cho {token} không hợp lệ hoặc quá dài.")

    output = _resolve_new_output(output_path)
    if output.suffix.lower() != ".docx":
        raise ValueError("File đầu ra phải có phần mở rộng .docx.")
    from docx import Document
    document = Document(str(source))
    replacement_counts = {token: 0 for token in replacements}
    for paragraph in _all_paragraphs(document):
        counts = _replace_runs(paragraph, replacements)
        for token, count in counts.items():
            replacement_counts[token] += count
    document.save(output)
    return json.dumps({"created": str(output), "source_preserved": True,
                       "placeholders_replaced": sum(replacement_counts.values()),
                       "replacement_counts": replacement_counts,
                       "unmatched_placeholders": [key for key, count in replacement_counts.items() if count == 0]}, ensure_ascii=False)


def update_workbook_copy(source_path: str, output_path: str, updates: list[dict[str, Any]]) -> str:
    source = _resolve_read(source_path)
    suffix = source.suffix.lower()
    if suffix not in {".xlsx", ".xlsm"}:
        raise ValueError("Chỉ hỗ trợ workbook .xlsx hoặc .xlsm; file .xls cũ chưa được hỗ trợ.")
    if not updates or len(updates) > 200:
        raise ValueError("Cần từ 1 đến 200 cập nhật ô trong một lần gọi.")
    output = _resolve_new_output(output_path)
    if output.suffix.lower() != suffix:
        raise ValueError("File đầu ra phải giữ nguyên phần mở rộng của workbook nguồn.")
    from openpyxl import load_workbook
    workbook = load_workbook(source, keep_vba=(suffix == ".xlsm"), data_only=False)
    changed = []
    for item in updates:
        if set(item) != {"sheet", "cell", "value"}:
            raise ValueError("Mỗi cập nhật phải có đúng ba trường: sheet, cell, value.")
        sheet_name, address, value = item["sheet"], item["cell"], item["value"]
        if not isinstance(sheet_name, str) or not isinstance(address, str):
            raise ValueError("sheet và cell phải là chuỗi.")
        if not (value is None or isinstance(value, (str, int, float, bool))):
            raise ValueError("value chỉ nhận chuỗi, số, boolean hoặc null.")
        if isinstance(value, float) and (value != value or value in (float("inf"), float("-inf"))):
            raise ValueError("Không chấp nhận giá trị số không hữu hạn.")
        if sheet_name not in workbook.sheetnames:
            raise ValueError(f"Không tìm thấy sheet: {sheet_name}")
        if not re.fullmatch(r"[A-Z]{1,3}[1-9][0-9]{0,6}", address.upper()):
            raise ValueError(f"Địa chỉ ô không hợp lệ: {address}")
        workbook[sheet_name][address.upper()] = value
        changed.append({"sheet": sheet_name, "cell": address.upper()})
    workbook.save(output)
    workbook.close()
    return json.dumps({"created": str(output), "source_preserved": True, "updated_cells": changed}, ensure_ascii=False)


def export_word_to_pdf(raw_path: str, output_path: str) -> str:
    source = _resolve_read(raw_path)
    if source.suffix.lower() not in {".docx", ".doc"}:
        raise ValueError("Nguồn phải là file Word .doc hoặc .docx.")
    output = _resolve_new_output(output_path)
    if output.suffix.lower() != ".pdf":
        raise ValueError("Tên file đầu ra phải có phần mở rộng .pdf.")
    try:
        import pythoncom
        import win32com.client
    except ImportError as exc:
        raise RuntimeError("Chưa có pywin32. Chạy setup.ps1 để cài và cần Microsoft Word trên máy.") from exc

    pythoncom.CoInitialize()
    word = None
    document = None
    try:
        word = win32com.client.DispatchEx("Word.Application")
        word.Visible = False
        word.DisplayAlerts = 0
        # msoAutomationSecurityForceDisable: do not run VBA macros or AutoOpen code.
        word.AutomationSecurity = 3
        document = word.Documents.Open(str(source), ReadOnly=True, AddToRecentFiles=False, ConfirmConversions=False)
        document.SaveAs2(str(output), FileFormat=17)
    finally:
        if document is not None:
            document.Close(False)
        if word is not None:
            word.Quit()
        pythoncom.CoUninitialize()
    return json.dumps({"created": str(output), "source_preserved": True, "pdf": True}, ensure_ascii=False)


def open_file(raw_path: str) -> str:
    path = _resolve_read(raw_path)
    if path.suffix.lower() not in {".pdf", ".doc", ".docx", ".xls", ".xlsx", ".xlsm", ".csv", ".txt", ".md"}:
        raise ValueError("Chỉ mở các định dạng tài liệu phổ biến; không mở file thực thi hoặc script.")
    if os.name != "nt":
        raise RuntimeError("Công cụ mở file hiện chỉ dành cho Windows.")
    os.startfile(str(path))  # noqa: S606 - opens only a previously validated, user-allowed document.
    return json.dumps({"opened": str(path), "note": "Ứng dụng mặc định của Windows đã được yêu cầu mở file."}, ensure_ascii=False)
