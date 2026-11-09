"""MCP entry point for local Office/PDF tools used by OpenMausBot."""
from __future__ import annotations

import logging

from mcp.server import MCPServer

import office_ops

logging.basicConfig(level=logging.INFO, format="[office-agent] %(levelname)s %(message)s")
mcp = MCPServer("OpenMausBot Windows Office Agent")


@mcp.tool()
def list_allowed_roots() -> str:
    """Show only the folders the user explicitly granted to this document agent."""
    return office_ops.list_allowed_roots()


@mcp.tool()
def find_files(query: str, root_id: str = "", pattern: str = "*", max_results: int = 50) -> str:
    """Find local files by filename inside approved folders; never searches the whole computer."""
    return office_ops.find_files(query, root_id, pattern, max_results)


@mcp.tool()
def inspect_document(path: str) -> str:
    """Read text and a bounded preview from PDF, DOCX, XLSX, XLSM, CSV, TXT, MD or JSON."""
    return office_ops.inspect_document(path)


@mcp.tool()
def create_docx_from_template(template_path: str, output_path: str, replacements: dict[str, str]) -> str:
    """Create a new DOCX from a DOCX template, replacing {{PLACEHOLDER}} tokens. Never overwrites files."""
    return office_ops.create_docx_from_template(template_path, output_path, replacements)


@mcp.tool()
def update_workbook_copy(source_path: str, output_path: str, updates: list[dict[str, str]]) -> str:
    """Create a separate XLSX/XLSM copy and update selected cells; the source workbook is preserved."""
    return office_ops.update_workbook_copy(source_path, output_path, updates)


@mcp.tool()
def export_word_to_pdf(source_path: str, output_path: str) -> str:
    """Export a Word file to a new PDF using installed Microsoft Word; does not modify the Word source."""
    return office_ops.export_word_to_pdf(source_path, output_path)


@mcp.tool()
def open_file(path: str) -> str:
    """Open an approved local file in its default Windows application for visual review."""
    return office_ops.open_file(path)


if __name__ == "__main__":
    mcp.run()
