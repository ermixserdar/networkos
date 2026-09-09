# Progress

## Completed

- Expo Router mobile shell with Home, Contacts, Network, Follow up, and More tabs
- Local SQLite database bootstrap, WAL, foreign keys, transactional versioned migration
- SecureStore database-key boundary
- Contacts, companies, relationships, interactions, tags, owner profile schema
- Parameterized repositories and service-layer CRUD/traversal/health logic
- Contact search, contact creation, profile, follow-up list, bounded network exploration
- Soft delete, sync metadata, indexes, architecture/security/sync docs
- TypeScript validation passes (`npm run typecheck`)
- Jest command passes with relationship graph tests (`npm test`)
- Identity surfaces reworked: relationship-focused Home, richer Contact Profile, and interactive Network canvas with d3-force layout, SVG nodes/edges, pan, pinch zoom, and focus state
- Network shortest-path mode: select a source, choose a destination, highlight the route, show degree count, and handle no-path results within six degrees
- Graph topology now uses real relationship edges from a bounded recursive SQLite query; edge width reflects relationship strength
- SVG node interaction hardened with native `react-native-svg` groups; d3-force now receives the real relationship link set
- Companies, relationships, interactions, and follow-up creation flows are now reachable from the mobile UI
- Local follow-up notification scheduling and JSON/CSV sharing exports added
- Native JSON backup restore via document picker with explicit merge confirmation
- Full backup encrypted with `tweetnacl.secretbox` using a key derived from the SecureStore database key
- Tags screen and persistent biometric app-lock setting with launch-time lock gate
- Owner profile editor and Company Profile with linked people
- Contact Profile tag assignment flow
- Follow-up notification IDs persist per contact and are cancelled before rescheduling
- iOS and Android Hermes bundle exports pass (`npx expo export --platform ios|android`)
- Automated NetworkService tests and Expo Jest preset
- Expo SDK 55 dependency alignment completed (React Native 0.83.10, matching Babel/codegen/native modules)
- iOS CocoaPods installation and simulator native build pass (`npx expo run:ios --no-install`)
- Fresh NetworkOS iOS binary installed and launched on iPhone 16e simulator

## In Progress

- Native SQLCipher adapter and production device notification verification
- Expanded repository/database/backup test coverage

## Remaining

- Multi-node path visualization beyond the bounded neighborhood
- Android native debug/release build and iOS/Android physical-device QA

## Known Issues

- Use the generated native development build after dependency changes; Expo Go or an older dev client can produce `PlatformConstants` module errors.
- Expo lint configuration was auto-created by the CLI; native lint/build verification still needs a device build.
- JSON/CSV export and encrypted merge-restore are implemented; native device builds still need manual iOS/Android verification.
- SQLCipher is documented and isolated but needs a custom native build adapter.
- Expo doctor could not complete because the environment lost DNS access while resolving the package.

## Architecture Decisions

- Local SQLite is primary source of truth.
- Repositories are the only database access layer.
- Relationship pairs are canonicalized with a unique expression index.
- Shortest path uses bounded breadth-first search with visited-node cycle protection.
