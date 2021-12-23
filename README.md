# weavebox-web
An end-to-end encrypted dApp for storing your most important files, permanently!

Weavebox saves your important files on the Arweave network, a decentralized low-cost data storage platform that focused on permanent storage.

Before every upload, Weavebox use a cryptographically random generated AES-GCM key and salt to encrypt your file data, the key and salt data is asymmetrically encrypted with file names, title, tags and memo text, using your wallet's public key. The final result is that only you with wallet's private key can access your uploaded files.
