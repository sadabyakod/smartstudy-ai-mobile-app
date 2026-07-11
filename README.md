# SmartStudyAI Mobile App

This app includes a public privacy policy page for Google Play Console compliance.

## Publish privacy policy

- The public privacy policy is available at `docs/privacy-policy.html`.
- The repository includes a GitHub Actions workflow in `.github/workflows/deploy-pages.yml` to publish this folder to GitHub Pages.
- After publishing, use the resulting URL in Play Console’s **Privacy policy** field, for example:
  `https://<github-username>.github.io/<repo>/privacy-policy.html`

## Notes

- The page is intentionally hosted as a static HTML document so it can be referenced by the Play Store.
- If the Play Console still rejects the URL, ensure the GitHub Pages site is enabled and the URL resolves successfully in a browser.
