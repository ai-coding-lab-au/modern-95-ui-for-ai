# Contributing

Use Modern 95 UI in your own project, then submit a focused, shareable lesson. The maintainer reviews changes to the shared skill; project-local workarounds do not automatically become global rules.

## A useful lesson

Include the skill version, framework, affected component, expected result, actual result, minimal reproduction and evidence type. Distinguish a product defect, a theme regression, a test-fixture error and a preference. State which behavior and geometry must remain unchanged.

Use the [feedback template](docs/feedback-template.md). Attach synthetic screenshots or a minimal example only when you have permission to share them. Remove names, emails, customer data, local usernames, absolute paths, tokens, private repository links, logs and metadata that reveal internal information. Recreated generic examples are preferable to copied project extracts.

Submit reviewed feedback through [GitHub issues](https://github.com/ai-coding-lab-au/modern-95-ui-for-ai/issues) or propose a focused pull request. AI agents must obtain the user's authorization before sending material to a remote service.

## Shared changes

- Keep component-specific selectors and platform patches in the target project until repeated evidence supports a general rule.
- Preserve the shared numerical baseline unless a visual change is explicitly approved. Record named variants separately.
- Use small changes with before/after evidence and a representative workflow. Identify skipped native, DPI or assistive-technology checks.
- Run `npm test`; run relevant browser checks for visual or interaction changes. Keep profiles, raw logs and downloads outside the repository.
- Include the source and license for every third-party addition. Project contributions are offered under the root MIT license; third-party assets retain their own terms.

Do not post credentials or private user data in a public issue. If a report contains sensitive material, contact the maintainer through an available private channel before sharing the details.
