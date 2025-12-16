# Products Dashboard - Angular Frontend

A modern, real-time product management application built with Angular 19, AWS AppSync, and Cognito authentication.

## Features

- 🔐 **Secure Authentication** - AWS Cognito with OAuth 2.0 Hosted UI
- ⚡ **Real-time Updates** - WebSocket subscriptions via AWS AppSync
- 🎨 **Material Design** - Clean, responsive UI with Angular Material
- 🔄 **Auto-reconnection** - Resilient WebSocket connections with exponential backoff
- 📊 **Data Management** - Full CRUD operations with optimistic UI updates
- 🛡️ **Type-safe** - Built with TypeScript in strict mode
- 🎯 **Centralized Services** - Clean architecture with separation of concerns

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- AWS account with deployed backend (AppSync + Cognito)
- Angular CLI: `npm install -g @angular/cli`

### Installation

```bash
# Install dependencies
npm install

# Update environment configuration
# Edit src/environments/environment.ts with your AWS resources
```

### Configuration

Update `src/environments/environment.ts` with your AWS resource values:

```typescript
export const environment = {
  production: false,
  appSyncEndpoint: 'https://xxxxx.appsync-api.us-east-1.amazonaws.com/graphql',
  awsRegion: 'us-east-1',
  cognitoUserPoolId: 'us-east-1_xxxxxxxxx',
  cognitoClientId: 'xxxxxxxxxxxxxxxxxxxxxxxxxx',
  cognitoDomain: 'your-domain.auth.us-east-1.amazoncognito.com',
  redirectSignIn: ['http://localhost:4200'],
  redirectSignOut: ['http://localhost:4200'],
};
```

### Development Server

```bash
npm start
# or
ng serve
```

Navigate to `http://localhost:4200/`. The app will automatically reload on file changes.

### Building for Production

```bash
npm run build
# Output in dist/ directory
```

## Project Structure

```
src/app/
├── core/                    # Core services (singleton)
│   ├── models/              # Core data models
│   └── services/
│       ├── auth.service.ts          # Authentication management
│       └── error-handler.service.ts # Global error handling
├── components/              # Feature components
│   ├── auth/                # Login/authentication
│   ├── product-table/       # Product list with real-time updates
│   └── product-dialog/      # Create/edit product modal
├── guards/                  # Route protection
├── models/                  # Domain models
├── services/                # Feature services
│   └── products.service.ts  # Product CRUD + subscriptions
└── graphql/                 # GraphQL operations
```

## Architecture

### Core Services

**AuthService** - Centralized authentication
- Manages auth state with RxJS observables
- Handles OAuth callbacks and token refresh
- Provides reactive auth state for components

**ErrorHandlerService** - Global error management
- Transforms GraphQL errors into user-friendly messages
- Categorizes errors (auth, validation, network)
- Consistent notification system

**ProductsService** - Data access and real-time updates
- CRUD operations via GraphQL
- WebSocket subscriptions for real-time updates
- Connection status tracking
- Automatic reconnection with exponential backoff

### Real-time Updates

The application uses AWS AppSync subscriptions for real-time updates:

```typescript
// Subscribe to all mutation events
productsService.subscribeToMutations().subscribe(event => {
  switch(event.type) {
    case 'create': // Handle new product
    case 'update': // Handle updated product
    case 'delete': // Handle deleted product
  }
});
```

### Connection Resilience

Automatic reconnection with exponential backoff:
- Attempt 1: 1 second delay
- Attempt 2: 2 seconds delay
- Attempt 3: 4 seconds delay
- Attempt 4: 8 seconds delay
- Attempt 5: 16 seconds delay

Connection status is tracked and displayed in the UI.

## Security

### Authentication Flow

1. User clicks "Sign In"
2. Redirects to Cognito Hosted UI
3. User authenticates
4. Redirects back with auth code
5. Amplify exchanges code for tokens
6. Tokens stored securely
7. Auto-refresh before expiration

### Security Features

- ✅ No hardcoded credentials
- ✅ Environment variables for configuration
- ✅ JWT token authentication
- ✅ Automatic token refresh
- ✅ Global logout (all devices)
- ✅ Route guards for protected pages
- ✅ Secure error messages
- ✅ XSS protection

See [SECURITY.md](./SECURITY.md) for detailed security documentation.

## Documentation

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Detailed architecture guide
- **[SECURITY.md](./SECURITY.md)** - Security best practices
- **[SETUP.md](./SETUP.md)** - Detailed setup instructions
- **[REFACTORING_SUMMARY.md](./REFACTORING_SUMMARY.md)** - Recent improvements

## Development

### Code Scaffolding

Generate new components:

```bash
ng generate component component-name
ng generate service service-name
ng generate guard guard-name
```

### Running Tests

```bash
# Unit tests
ng test

# E2E tests
ng e2e

# Code coverage
ng test --code-coverage
```

### Linting

```bash
ng lint
```

## Common Tasks

### Adding a New Feature

1. Create feature component: `ng generate component features/my-feature`
2. Create feature service: `ng generate service features/my-feature/my-feature`
3. Add route in `app.routes.ts`
4. Add guard if authentication required

### Handling Errors

Use the centralized ErrorHandlerService:

```typescript
constructor(private errorHandler: ErrorHandlerService) {}

// Show error
this.errorHandler.showError(error);

// Show success
this.errorHandler.showSuccess('Operation completed');

// Show info
this.errorHandler.showInfo('Information message');
```

### Tracking Auth State

Subscribe to auth state changes:

```typescript
constructor(private authService: AuthService) {}

this.authService.authState$.subscribe(state => {
  if (state.isAuthenticated) {
    // User is logged in
  }
});
```

## Troubleshooting

### Subscriptions Not Connecting

1. Check AppSync endpoint in environment.ts
2. Verify Cognito tokens are valid
3. Check browser console for WebSocket errors
4. Review connection status indicator in UI

### Authentication Issues

1. Verify Cognito configuration
2. Check redirect URLs match exactly
3. Clear browser cache and cookies
4. Verify user pool settings in AWS Console

### Build Errors

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear Angular cache
rm -rf .angular
```

## Performance

### Current Optimizations

- Standalone components for better tree-shaking
- Lazy loading ready (routes can be lazy loaded)
- OnPush change detection (can be added)
- Proper subscription cleanup
- Debounced mutation events

### Future Optimizations

- Virtual scrolling for large datasets
- Server-side pagination
- Advanced caching with Apollo Client
- Service worker for offline support

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Contributing

1. Create feature branch
2. Make changes
3. Add tests
4. Run linter
5. Submit pull request

## Tech Stack

- **Framework**: Angular 19
- **UI Library**: Angular Material
- **State Management**: RxJS
- **AWS Integration**: AWS Amplify
- **GraphQL Client**: AWS Amplify API
- **Authentication**: AWS Cognito
- **API**: AWS AppSync

## License

This project is part of the AWS Prescriptive Guidance example.

## Additional Resources

- [Angular Documentation](https://angular.io/docs)
- [Angular Material](https://material.angular.io/)
- [AWS Amplify](https://docs.amplify.aws/)
- [AWS AppSync](https://docs.aws.amazon.com/appsync/)
- [RxJS](https://rxjs.dev/)
