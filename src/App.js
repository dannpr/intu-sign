/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState } from "react";
import { SignClient } from "@walletconnect/sign-client";
import { Web3Modal } from "@web3modal/standalone";
import './App.css';

const web3Modal = new Web3Modal({
  projectId: process.env.REACT_APP_PROJECT_ID,
  standaloneChains: ["eip155:5"]
});

function App() {
  const [signClient, setSignClient] = useState();
  const [sessions, setSessions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [txHash, setTxHash] = useState();
  const reset = () => {
    setAccounts([]);
    setSessions([]);
  };

  async function createClient() {
    try {
      const client = await SignClient.init({
        projectId: process.env.REACT_APP_PROJECT_ID,
      })
      console.log(client);
      setSignClient(client);
      await subscribeToEvents(client);
    } catch (e) {
      console.log(e);
    }
  }

  async function handleConnect() {
    if (!signClient) throw Error("cannot connect, signClient is not defined")
    try {
      // wotkflow of the dapp to connect to the wallet
      // 1. dapp is going to send a proposal namespace ( asking for permission to do things with the wallet and listen to their event)
      const proposalNamespace = {
        eip155: {
          chains: ["eip155:5"],
          methods: ["eth_sendTransaction"],
          events: ["connect", "disconnect"]
        }
      };

      const { uri, approval } = await signClient.connect({
        requiredNamespaces: proposalNamespace
      });

      console.log('uri', uri);

      // 2. open web3 modal that will be our portal
      if (uri) {
        web3Modal.openModal({ uri })
        const sessionNamespace = await approval();
        console.log("sessionNamespace", sessionNamespace)
        onSessionConnect(sessionNamespace)
        //close the modal
        web3Modal.closeModal();
      }

      // 2.1 create a wallet that already integrated signV2 so we need to do the integration with our wallet
    } catch (e) {
      console.log(e);
    }
  }

  async function onSessionConnect(session) {
    if (!session) throw Error("session doesn't even exist")
    try {
      setSessions(session)
      setAccounts(session.namespaces.eip155.accounts[0].slice(9));
    } catch (e) {
      console.log(e);
    }
  }

  async function handleDisconnect() {
    try {
      await signClient.disconnect({
        topic: sessions.topic,
        code: 6000,
        message: "User disconnected"
      });
      reset();
    } catch (e) {
      console.log(e);
    }
  }

  async function subscribeToEvents(client) {
    if (!client)
      throw Error("No events to subscribe to b/c client is not defined");

    try {
      client.on("session_delete", () => {
        console.log("user disconnected the session from their wallet");
        reset();
      });
    } catch (e) {
      console.log(e);
    }
  }

  async function handleSend() {
    try {
      const tx = {
        from: accounts,
        to: "0xBDE1EAE59cE082505bB73fedBa56252b1b9C60Ce",
        data: "0x",
        gasPrice: "0x029104e28c",
        gasLimit: "0x5208",
        value: "0x0.00014F8B588E368F0846",
      };
      const result = await signClient.request({
        topic: sessions.topic,
        request: {
          method: "eth_sendTransaction",
          params: [tx]
        },
        chainId: "eip155:5"
      })
      setTxHash(result)
    } catch (e) {
      console.log(e);
    }
  }

  useEffect(() => {
    if (!signClient) {
      createClient();
    }
  }, [signClient]);

  return (
    <div className="App">
      <h1> INTU-nnexion </h1>
      {accounts.length ? (
        <>
          <p>{accounts}</p>
          <button onClick={handleDisconnect}>Disconnect</button>
          <button onClick={handleSend}>Send</button>
          {txHash &&
            <h2> Check your Transaction Hash {" "}
              <a
                href={`https://goerli.etherscan.io/tx/${txHash}`}
                target="_blank"
                rel="noreferer noreferrer"
              >here
              </a>
              !
            </h2>
          }
        </>
      ) : (
        <button onClick={handleConnect} disabled={!signClient}>
          Connect
        </button>
      )
      }
    </div>
  );
}

export default App;
