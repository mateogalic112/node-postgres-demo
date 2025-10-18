# Node.js Web Socket Server Template

### Starting project 🚀

- **Step 1** - Install dependencies

```bash
yarn install
```

- **Step 2** - Run the server in development mode

```bash
yarn dev
```

- **Step 3** - Run the stripe webhook listener in a separate terminal

```bash
stripe listen --forward-to localhost:4000/api/v1/orders/confirm-order
```
