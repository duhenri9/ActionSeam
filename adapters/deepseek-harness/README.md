# DeepSeek Harness runtime adapter

**Status: not implemented.**

This directory currently contains only the public-source provenance record used to plan a future `RuntimeAdapter`.

The first implementation will target an exact DeepSeek Harness version and use documented public package/CLI/profile/plugin/event surfaces. If an ActionSeam profile requires control or evidence that the upstream surface does not provide, that profile will report `UNSUPPORTED` or `INDETERMINATE` rather than approximating a pass.

No compatibility claim exists until executable adapter evidence lands in this repository.
