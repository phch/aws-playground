// GraphQL Query Operations

export const listProductsQuery = `
  query ListProducts {
    listProducts {
      id
      name
      description
      price
      category
      stockQuantity
      createdAt
      updatedAt
    }
  }
`;

export const getProductQuery = `
  query GetProduct($id: ID!) {
    getProduct(id: $id) {
      id
      name
      description
      price
      category
      stockQuantity
      createdAt
      updatedAt
    }
  }
`;

// GraphQL Mutation Operations

export const createProductMutation = `
  mutation CreateProduct($input: CreateProductInput!) {
    createProduct(input: $input) {
      id
      name
      description
      price
      category
      stockQuantity
      createdAt
      updatedAt
    }
  }
`;

export const updateProductMutation = `
  mutation UpdateProduct($input: UpdateProductInput!) {
    updateProduct(input: $input) {
      id
      name
      description
      price
      category
      stockQuantity
      createdAt
      updatedAt
    }
  }
`;

export const deleteProductMutation = `
  mutation DeleteProduct($id: ID!) {
    deleteProduct(id: $id) {
      id
      message
    }
  }
`;

// GraphQL Subscription Operations

export const onCreateProductSubscription = `
  subscription OnCreateProduct {
    onCreateProduct {
      id
      name
      description
      price
      category
      stockQuantity
      createdAt
      updatedAt
    }
  }
`;

export const onUpdateProductSubscription = `
  subscription OnUpdateProduct {
    onUpdateProduct {
      id
      name
      description
      price
      category
      stockQuantity
      createdAt
      updatedAt
    }
  }
`;

export const onDeleteProductSubscription = `
  subscription OnDeleteProduct {
    onDeleteProduct {
      id
      message
    }
  }
`;
