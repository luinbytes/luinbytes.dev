# Local Picomatch backport

This temporary, private package vendors [Picomatch 4.0.7](https://github.com/micromatch/picomatch/tree/6bb40679c218cefba5d4e9662408c5fdf699a8bb) under its MIT license.

Only `lib/parse.js` differs from the upstream runtime files. It carries the three defensive changes for [GHSA-fc5q-39xc-vjpf](https://github.com/advisories/GHSA-fc5q-39xc-vjpf) from [the public fork at 3ab5a76](https://github.com/ryotsu-kankichi/secured-picomatch/tree/3ab5a7627d480259e3d9ca67fbc14c125d374f0e). Ordinary globstar, bracket and fast-path behavior comes from upstream 4.0.7.

The root npm override makes Vite, tinyglobby and fdir resolve this checked-in package. When upstream publishes a compatible fix, remove the root Picomatch dependency and override, refresh the lockfile, and rerun the full audit and tests. The test in `tests/tooling/picomatch.test.mjs` exercises the filename behavior through Vite and the tinyglobby used by typescript-eslint.
