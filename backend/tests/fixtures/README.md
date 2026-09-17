# Document conversion integration fixtures

Place `sample.doc` and `sample.docx` here for LibreOffice integration tests.

Run integration tests with:

```bash
LIBREOFFICE_INTEGRATION=1 bun test tests/document-conversion.integration.test.ts
```

If fixtures are missing, those tests remain skipped.
