# Debug Session: teacher-save-failure
- **Status**: [OPEN]
- **Issue**: Data guru baru tidak tersimpan saat user mencoba menambah guru dari halaman admin.
- **Debug Server**: Pending
- **Log File**: .dbg/trae-debug-log-teacher-save-failure.ndjson

## Reproduction Steps
1. Buka halaman `Data Guru`.
2. Isi form tambah guru.
3. Simpan data.
4. Data tidak masuk / tidak muncul sebagai tersimpan.

## Hypotheses & Verification
| ID | Hypothesis | Likelihood | Effort | Evidence |
|----|------------|------------|--------|----------|
| A | API `POST /api/teachers` gagal validasi payload dari form | High | Low | Pending |
| B | Sinkron `Teacher -> User` atau provisioning Firebase gagal dan membatalkan simpan | High | Med | Pending |
| C | Ada constraint Prisma/database yang gagal saat create teacher | Med | Med | Pending |
| D | Form UI mengirim field yang salah / kurang sehingga request tidak valid | Med | Low | Pending |
| E | UI menelan error API sehingga terlihat seperti tidak terjadi apa-apa | Med | Low | Pending |

## Log Evidence
- Pending

## Verification Conclusion
- Pending
