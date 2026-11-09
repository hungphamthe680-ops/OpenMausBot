# Hướng dẫn cài Windows Office Agent vào OpenMausBot / Muse Desktop Duo

## 1. Giải nén và cài thư viện

1. Giải nén thư mục `windows-office-agent` vào nơi ổn định, ví dụ `D:\\AI-Lab\\windows-office-agent`.
2. Mở PowerShell tại thư mục đó.
3. Chạy:

   ```powershell
   Set-ExecutionPolicy -Scope Process Bypass
   .\\setup.ps1
   ```

4. Script tạo môi trường Python riêng `.venv`, cài MCP SDK và thư viện xử lý PDF/Word/Excel, đồng thời tạo thư mục làm việc mặc định:
   `%USERPROFILE%\\Documents\\OpenMausBot-Agent`.

Yêu cầu: Windows 10/11 và Python 3.11 trở lên. Cài đặt cần Internet để tải các thư viện một lần. Dùng Microsoft Word desktop nếu cần xuất DOC/DOCX thành PDF.

## 2. Thêm MCP server vào OpenMausBot

Mở:

**Plugins → MCP servers → Add server → Run a command**

Điền ba phần:

**Command** — đường dẫn Python trong môi trường riêng:

```text
D:\\AI-Lab\\windows-office-agent\\.venv\\Scripts\\python.exe
```

**Argument** — một đối số, là đường dẫn `server.py`:

```text
D:\\AI-Lab\\windows-office-agent\\server.py
```

**Environment variable**:

```text
OMB_AGENT_ALLOWED_ROOTS=C:\\Users\\TEN_WINDOWS\\Documents\\OpenMausBot-Agent;D:\\DuAn\\HoSoHopDong
```

Thay `TEN_WINDOWS` và các thư mục ví dụ bằng đường dẫn thật trên máy. Chỉ thêm các thư mục ông chủ động cấp quyền. Không cấp toàn bộ `C:\\`, thư mục Windows, Program Files hoặc thư mục có mật khẩu/khóa bí mật.

Bấm Add/Save và chờ trạng thái MCP hiển thị Connected, các tool được liệt kê.

## 3. Bật quyền điều khiển giao diện Windows

Office Agent xử lý file bằng Python. Khi cần click, gõ, phím tắt, cuộn hoặc làm việc với hộp thoại in, bot dùng **CUA Driver có sẵn** trong OpenMausBot. Mở Computer panel, bật This computer/local computer và hoàn tất các bước cấp quyền nếu ứng dụng hoặc Windows yêu cầu. Không cần cài thêm một bộ click chuột khác.

## 4. Kiểm tra an toàn trước

Đưa một vài file bản sao vào `Documents\\OpenMausBot-Agent`, sau đó giao lệnh thử:

> Liệt kê thư mục được cấp quyền, tìm file có tên sample, đọc nội dung PDF và tóm tắt. Không sửa file gốc.

Tiếp theo thử tạo tài liệu:

> Dùng mẫu DOCX có sẵn, thay placeholder {{HO_TEN}} bằng Nguyễn Văn A và tạo một file mới trong thư mục làm việc. Không ghi đè file nào.

Các placeholder Word cần nằm trọn trong một text run, ví dụ `{{HO_TEN}}`. Nếu Word chia token qua nhiều đoạn định dạng, công cụ sẽ từ chối thay thế để không làm hỏng mẫu.

## 5. Quy tắc thao tác

- Python ưu tiên tìm, đọc, trích xuất, tạo bản sao Word/Excel/PDF.
- CUA chỉ thao tác giao diện khi thật sự cần: xem bố cục, mở ứng dụng cũ, xử lý hộp thoại.
- File nguồn không bị sửa hoặc xóa; đầu ra phải là tên file mới.
- Không có tool in trực tiếp. Bot phải mở bản kết quả để ông kiểm tra và chỉ thao tác Ctrl+P/hộp thoại in sau khi ông xác nhận riêng.
- Không gửi dữ liệu ra mạng bằng MCP server này; server xử lý tại máy. Tuy nhiên, nội dung ông đưa vào một mô hình AI trực tuyến vẫn có thể được gửi tới nhà cung cấp mô hình theo cách hoạt động của dịch vụ đó. Chọn model local/offline khi không muốn đưa nội dung hồ sơ ra ngoài.

## 6. Giới hạn cần biết

- PDF hiện trích xuất lớp văn bản; PDF scan/ảnh cần một bước OCR riêng.
- DOCX được đọc và điền placeholder; chưa phải trình chỉnh sửa Word toàn diện.
- Excel được đọc/ghi bằng openpyxl. Công thức được lưu nhưng kết quả công thức sẽ tính lại khi mở bằng Excel. Một số thành phần nâng cao như Pivot cache, slicer, OLE, Power Query hoặc chart extension có thể không được giữ nguyên hoàn toàn; với workbook quan trọng, nên chỉ đọc bằng tool rồi sửa bản sao qua Excel UI/CUA và kiểm tra lại.
- `.xls` cũ có thể mở bằng ứng dụng mặc định nhưng chưa được đọc/ghi bằng công cụ bảng tính này.
- Không thể xác nhận in thành công chỉ bằng việc gửi lệnh mở hộp thoại; cần kiểm tra trạng thái máy in.

## 7. Kiểm tra bộ mã

```powershell
.\\.venv\\Scripts\\python.exe -m unittest -v test_office_ops.py
```

Bộ test hiện kiểm tra tìm kiếm trong vùng cấp quyền, từ chối đường dẫn ngoài vùng, chặn ghi đè, đọc TXT/PDF, tạo DOCX từ mẫu và tạo bản sao XLSX có kiểu dữ liệu/công thức.
