from __future__ import annotations

import os
import tempfile
import unittest
from pathlib import Path

import office_ops


class OfficeOpsTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name) / "allowed"
        self.root.mkdir()
        self.outside = Path(self.temp.name) / "outside"
        self.outside.mkdir()
        self.previous = os.environ.get("OMB_AGENT_ALLOWED_ROOTS")
        os.environ["OMB_AGENT_ALLOWED_ROOTS"] = str(self.root)

    def tearDown(self):
        if self.previous is None:
            os.environ.pop("OMB_AGENT_ALLOWED_ROOTS", None)
        else:
            os.environ["OMB_AGENT_ALLOWED_ROOTS"] = self.previous
        self.temp.cleanup()

    def test_find_files_is_limited_to_allowed_root(self):
        (self.root / "hop_dong_C02.docx").write_text("placeholder", encoding="utf-8")
        (self.outside / "hop_dong_C02_secret.docx").write_text("secret", encoding="utf-8")
        result = office_ops.find_files("C02")
        self.assertIn("hop_dong_C02.docx", result)
        self.assertNotIn("hop_dong_C02_secret.docx", result)

    def test_rejects_path_outside_allowed_root(self):
        external = self.outside / "private.txt"
        external.write_text("not allowed", encoding="utf-8")
        with self.assertRaises(PermissionError):
            office_ops.inspect_document(str(external))

    def test_rejects_traversal_and_source_overwrite(self):
        with self.assertRaises(PermissionError):
            office_ops._resolve_new_output(str(self.outside / "escape.docx"))
        source = self.root / "same.txt"
        source.write_text("original", encoding="utf-8")
        with self.assertRaises(FileExistsError):
            office_ops._resolve_new_output(str(source))

    def test_inspects_text_file(self):
        path = self.root / "note.txt"
        path.write_text("Xin chao", encoding="utf-8")
        self.assertIn("Xin chao", office_ops.inspect_document(str(path)))

    def test_creates_docx_without_touching_template(self):
        from docx import Document
        template = self.root / "template.docx"
        doc = Document()
        doc.add_paragraph("Kinh gui {{HO_TEN}}")
        doc.save(template)
        output = self.root / "notice.docx"
        office_ops.create_docx_from_template(str(template), str(output), {"{{HO_TEN}}": "Nguyen Van A"})
        self.assertTrue(output.exists())
        reopened = Document(str(output))
        self.assertEqual(reopened.paragraphs[0].text, "Kinh gui Nguyen Van A")
        self.assertTrue(template.exists())


    def test_inspects_pdf_page_count(self):
        from pypdf import PdfWriter
        path = self.root / "sample.pdf"
        writer = PdfWriter()
        writer.add_blank_page(width=595, height=842)
        with path.open("wb") as handle:
            writer.write(handle)
        result = office_ops.inspect_document(str(path))
        self.assertIn('"page_count": 1', result)

    def test_updates_workbook_copy_with_typed_values_and_preserves_source(self):
        from openpyxl import Workbook, load_workbook
        source = self.root / "source.xlsx"
        output = self.root / "updated.xlsx"
        workbook = Workbook()
        workbook.active.title = "Theo doi"
        workbook["Theo doi"]["A1"] = "Goc"
        workbook.save(source)
        workbook.close()

        office_ops.update_workbook_copy(
            str(source), str(output),
            [
                {"sheet": "Theo doi", "cell": "A1", "value": 250000},
                {"sheet": "Theo doi", "cell": "A2", "value": "=SUM(100,200)"},
            ],
        )
        original = load_workbook(source, data_only=False)
        changed = load_workbook(output, data_only=False)
        self.assertEqual(original["Theo doi"]["A1"].value, "Goc")
        self.assertEqual(changed["Theo doi"]["A1"].value, 250000)
        self.assertEqual(changed["Theo doi"]["A2"].value, "=SUM(100,200)")
        original.close()
        changed.close()

if __name__ == "__main__":
    unittest.main()
