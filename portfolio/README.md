# Portfolio PDF builder

The checked-in source package and the PDF are intentionally separated. The generated PDF is written to `output/pdf/` and is excluded from Git.

Before the final submission:

1. Publish the Bilibili video and the GitHub repository.
2. Paste both public URLs into `portfolio/links.json`.
3. Run:

   ```powershell
   & 'C:\Users\ws\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' portfolio\build_portfolio.py
   ```

When both URLs are present, the builder removes the draft watermark and creates clickable GitHub and demo-video annotations. Always render and inspect the final PDF again after rebuilding.
