# Implementation references

Official documentation was fetched through Context7's resolve-then-docs CLI workflow during this build.

- [scikit-learn: avoiding data leakage](https://scikit-learn.org/stable/common_pitfalls.html)
- [scikit-learn: decision threshold tuning](https://scikit-learn.org/stable/modules/classification_threshold.html)
- [scikit-learn: permutation importance](https://scikit-learn.org/stable/modules/permutation_importance.html)
- [FastAPI: lifespan initialization](https://fastapi.tiangolo.com/advanced/events/)
- [FastAPI: static files](https://fastapi.tiangolo.com/tutorial/static-files/)
- [React: synchronizing with Effects](https://react.dev/learn/synchronizing-with-effects)
- [Playwright: web server configuration](https://playwright.dev/docs/test-webserver)
- [Playwright: file upload inputs](https://playwright.dev/docs/input#upload-files)

FastAPI's latest docs describe a newer frontend-serving convenience API. This project intentionally uses StaticFiles, which is supported by the pinned FastAPI version. The serving layer uses hash navigation, so no SPA path rewrite is required.

- [GitHub Pages: custom Actions workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
- [Vite: GitHub Pages and public base paths](https://vite.dev/guide/static-deploy.html#github-pages)
- [RandomForestClassifier: probability mean and float32 input](https://scikit-learn.org/stable/modules/generated/sklearn.ensemble.RandomForestClassifier.html)
