# Project-C12

## Learn to Code: a step-by-step guide

**[Learn-to-Code-Complete-Guide.pdf](Learn-to-Code-Complete-Guide.pdf)** is a 189-page guide that goes from complete beginner to developer:

- Part 0–1: what coding is, how computers work, and which tools to use (beginner vs. developer)
- Parts 2–4: Python from zero, with exercises, three projects and quizzes
- Part 5: terminal, Git and GitHub, the internet, APIs, databases, security, teamwork
- Part 6: websites (HTML, CSS, JavaScript), a full portfolio project, publishing, backends
- Part 7: apps: websites vs apps, mobile (iOS/Android), desktop, PWAs, games, app stores
- Part 8: a tour of 20 programming languages
- Part 9: careers, a 12-month roadmap, project ideas and free resources
- Appendices: answers to every exercise, glossary, cheat sheets, troubleshooting, FAQ, checklist

### Rebuilding the PDF

The guide is generated from the Python files in `guide_source/`:

```bash
pip install reportlab
python3 guide_source/build.py            # writes Learn-to-Code-Complete-Guide.pdf
python3 guide_source/check_examples.py   # runs every Python example and compares its output
```
