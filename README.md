# NATS Relay Plugin

A TypeScript plugin for relaying messages to NATS (Neural Autonomic Transport System), a simple, secure, and high-performance open source messaging system.

## Overview

The NATS Relay Plugin is a transport plugin that enables applications to easily connect to and publish messages to a NATS server. It wraps the underlying NATS client functionality and provides a simple interface for initialization and message relaying. The plugin integrates with application performance monitoring (APM) to track transactions and spans, making it easy to monitor and troubleshoot message publishing.

## Features

- Connect to NATS servers with configurable connection settings
- Publish various data types (binary, string, object) to configurable NATS subjects
- Automatic data type conversion for simple integration
- APM integration for performance monitoring and tracing
- Comprehensive logging for debugging and operational visibility
- Simple API with just two methods: `init()` and `relay()`
- Written in TypeScript with full type safety
- Fully tested with Jest

## Core Components

- **NatsRelayPlugin Class**: Main implementation that handles connection and message relaying
- **Configuration Module**: Environment-based configuration system
- **Interface Definitions**: Type-safe contract definitions

## Installation

```bash
npm install nats-relay-plugin
```

## Configuration

The plugin uses environment variables for configuration. Create a `.env` file in the root directory with the following variables:

```
DESTINATION_TRANSPORT_URL=nats://localhost:4223
PRODUCER_STREAM=example.subject
```

### Configuration Options

| Environment Variable      | Description                              | Default Value         |
| ------------------------- | ---------------------------------------- | --------------------- |
| DESTINATION_TRANSPORT_URL | The URL of the NATS server to connect to | nats://localhost:4223 |
| PRODUCER_STREAM           | The subject to publish messages to       | example.subject       |

## Usage

### Basic Usage

```typescript
import NatsRelayPlugin from 'nats-relay-plugin';
import { LoggerService, Apm } from '@tazama-lf/frms-coe-lib';

// Create logger and APM instances
const loggerService = new LoggerService();
const apm = new Apm();

// Create plugin instance
const natsRelayPlugin = new NatsRelayPlugin(loggerService, apm);

// Initialize the plugin (connects to NATS server)
await natsRelayPlugin.init();

// Create some data to send (supports various formats)
const stringData = 'Hello, NATS!';
const binaryData = new TextEncoder().encode('Hello, NATS!');
const objectData = { message: 'Hello, NATS!', timestamp: Date.now() };

// Relay the data to NATS (each format is handled appropriately)
await natsRelayPlugin.relay(stringData);
await natsRelayPlugin.relay(binaryData);
await natsRelayPlugin.relay(objectData);
```

### Custom Implementation with Service Import

```typescript
import NatsRelayPlugin from 'nats-relay-plugin/service/natsRelayPlugin';
import { LoggerService, Apm } from '@tazama-lf/frms-coe-lib';

// Create logger and APM instances
const loggerService = new LoggerService();
const apm = new Apm();

// Create an instance with required dependencies
const myNatsRelay = new NatsRelayPlugin(loggerService, apm);

// Initialize the connection
await myNatsRelay.init();

// Send data with metadata for APM tracing
const data = {
  payload: 'Important message',
  metaData: {
    traceParent: 'your-trace-id', // Optional: For APM trace correlation
    messageId: 'msg-123',
  },
};
await myNatsRelay.relay(data);
```

## API Reference

### `NatsRelayPlugin` Class

The main class that implements the `ITransportPlugin` interface.

#### Constructor

```typescript
constructor(loggerService: LoggerService, apm: Apm)
```

- **Parameters**:
  - `loggerService`: An instance of LoggerService from @tazama-lf/frms-coe-lib for logging
  - `apm`: An instance of Apm from @tazama-lf/frms-coe-lib for performance monitoring

#### Methods

##### `init()`

Initializes the connection to the NATS server.

```typescript
async init(): Promise<void>
```

- **Returns**: A Promise that resolves when the connection is established
- **Functionality**:
  - Establishes connection to NATS server using the configured server URL
  - Logs success or failure of connection attempt
  - Handles connection errors gracefully

##### `relay(data)`

Relays (publishes) data to the configured NATS subject.

```typescript
async relay(data: any): Promise<void>
```

- **Parameters**:
  - `data`: The data to publish (can be Buffer, string, or object)
- **Returns**: A Promise that resolves when the data has been published
- **Functionality**:
  - Creates an APM transaction for monitoring
  - Creates a span to track the relay operation
  - Converts the input data to the appropriate format:
    - Buffers are sent as-is
    - Strings are sent as-is
    - Objects are JSON-serialized
  - Publishes the data to the configured NATS subject
  - Logs the operation and any errors
  - Ends the APM transaction

### Configuration Module

The `config.ts` module loads configuration from environment variables.

- **Functionality**:
  - Loads the .env file from the project root
  - Provides server URL and subject name with defaults
  - Exports a typed configuration object

### Interfaces

#### `ITransportPlugin`

Defines the contract for transport plugins.

```typescript
export interface ITransportPlugin {
  init: () => Promise<void>;
  relay: (data: any) => Promise<void>;
}
```

#### `IConfig`

Defines the configuration structure.

```typescript
export interface IConfig {
  serverUrl: string; // The URL of the server to connect to
  subject: string; // The subject to publish to
}
```

## Project Structure

```
nats-relay-plugin/
├── dist/                   # Compiled JavaScript output
├── node_modules/           # Dependencies
├── src/
│   ├── config.ts           # Configuration module
│   ├── index.ts            # Main entry point
│   ├── interfaces/
│   │   ├── IConfig.ts      # Configuration interface
│   │   └── ITransportPlugin.ts  # Plugin interface definition
│   └── service/
│       └── natsRelayPlugin.ts   # Main implementation
├── __tests__/
│   └── natsRelayPlugin.test.ts  # Tests for the plugin
├── .env                    # Environment variables (create this)
├── package.json            # Project metadata and dependencies
├── tsconfig.json           # TypeScript configuration
├── jest.config.ts          # Jest configuration
└── README.md               # This file
```

## Development

### Prerequisites

- Node.js (>=14.x)
- npm or yarn
- A running NATS server for testing

### Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file with your configuration
4. Build the project:
   ```bash
   npm run build
   ```

### Available Scripts

- `npm start` - Run the compiled application
- `npm run clean` - Clean build artifacts
- `npm run dev` - Run the application in development mode with hot reloading
- `npm run build` - Build the TypeScript code
- `npm test` - Run the test suite
- `npm run publish` - Run the publisher script
- `npm run lint` - Lint the codebase (ESLint and Prettier)
- `npm run fix:eslint` - Fix ESLint issues automatically
- `npm run fix:prettier` - Fix Prettier issues automatically

## Testing

The plugin includes comprehensive unit tests using Jest. The tests cover connection initialization, successful message relaying, and error handling scenarios. Mocks are used for NATS connections, logger service, and APM to isolate the testing of the plugin's functionality.

To run the tests:

```bash
npm test
```

<!-- ## License

ISC -->
