function Home(props: any) {
  return (
    <div className="flex flex-col gap-6 mt-4 items-start">
      <h2 className="text-3xl text-gray-800 font-bold">
        An end-to-end encrypted dApp for storing your most important files,
        permanently!
      </h2>
      <p>
        Weavebox saves your important files on the Arweave network, a
        decentralized low-cost data storage platform that focused on permanent
        storage.
      </p>
      <p>
        Before every upload, Weavebox use a cryptographically random generated
        AES-GCM key and salt to encrypt your file data, the key and salt data is
        asymmetrically encrypted with file names, title, tags and memo text,
        using your wallet's public key. The final result is that only you with
        wallet's private key can access your uploaded files.
      </p>
      <p>The open source code of Weavebox says why you can trust it.</p>
      <a href="https://github.com/taropi/weavebox-web" className="underline">
        https://github.com/taropi/weavebox-web
      </a>

      <button
        className="bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-full"
        onClick={props.start}
      >
        See Mybox
      </button>
    </div>
  );
}

export default Home;
