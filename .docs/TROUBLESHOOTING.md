# Troubleshooting

- **pnpm issues**: Delete `node_modules` and `pnpm-lock.yaml`, then run `pnpm install` and `pnpm store prune`.
- **Node.js issues**: Ensure you are using Node 26 (`nvm use`).
- **Vite issues**: Clear cache with `vite --force` or delete `node_modules/.vite`.
- **Jasmine issues**: Check ChromeHeadless configuration if tests timeout.
- **Husky issues**: Ensure hooks are executable (`chmod +x .husky/*`).
- **Reset Environment**: `make clean && make install`
