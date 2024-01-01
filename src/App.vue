<script setup>
import { useToast } from "vue-toast-notification";
import {
  createWeb3Modal,
  defaultConfig,
  useWeb3ModalProvider,
  useWeb3ModalAccount,
} from "@web3modal/ethers5/vue";
import { ethers } from "ethers";
import { computed, onBeforeMount, ref, watch } from "vue";
import { ABI, ContractAddresses } from "../constants/index";

const $toast = useToast();
// 1. Get projectId
const projectId = "YOUR_PROJECT_ID";
const userBalance = ref(null);
const loading = ref(false);
const numberOfPlayers = ref(null);
const isLotteryOpen = ref(false);
const gettingLotteryState = ref(true);
const recentWinner = ref("");
const raffleEntranceFee = ref(0);
const noRaffleAddress = ref(true);

// 2. Set chains
const mainnet = {
  chainId: 1,
  name: "Ethereum",
  currency: "ETH",
  explorerUrl: "https://etherscan.io",
  rpcUrl: "https://cloudflare-eth.com",
};

// 3. Create modal
const metadata = {
  name: "My Website",
  description: "My Website description",
  url: "https://mywebsite.com",
  icons: ["https://avatars.mywebsite.com/"],
};

createWeb3Modal({
  ethersConfig: defaultConfig({ metadata }),
  chains: [mainnet],
  projectId,
});

const isConnected = computed(() => {
  return useWeb3ModalAccount().isConnected.value;
});

const getBalance = async () => {
  if (isConnected.value) {
    userBalance.value = null;
    const { walletProvider } = useWeb3ModalProvider();
    const provider = new ethers.providers.Web3Provider(walletProvider.value);
    const signer = provider.getSigner();
    const balance = await signer.getBalance();
    userBalance.value = balance.toString() * 0.000000000000000001;
  }
};

async function registerContract() {
  const { walletProvider } = useWeb3ModalProvider();
  const provider = new ethers.providers.Web3Provider(walletProvider.value);
  const signer = provider.getSigner();
  const chainId = useWeb3ModalAccount().chainId.value;
  console.log(chainId);
  let contractAddress = ContractAddresses[chainId];
  console.log(ContractAddresses);
  console.log(contractAddress);
  contractAddress = contractAddress[contractAddress.length - 1];
  if (contractAddress) {
    noRaffleAddress.value = false;
    const contract = new ethers.Contract(contractAddress, ABI, signer);
    return { contract, provider };
  } else {
    noRaffleAddress.value = true;
    return;
  }
}

function listenForTransactionMine(transactionResponse, provider) {
  //   Listen and wait for the transaction to finish
  return new Promise((resolve, reject) => {
    provider.once(transactionResponse.hash, (transactionReceipt) => {
      resolve();
    });
  });
}

async function getEntranceFee() {
  const { contract } = await registerContract();
  let entranceFee = await contract.getEntranceFee();
  entranceFee = entranceFee.toString() * 0.000000000000000001;
  raffleEntranceFee.value = entranceFee;
  return entranceFee;
}

async function getNumOfPlayers() {
  const { contract } = await registerContract();
  let numPlayers = await contract.getNumberOfPlayers();
  numPlayers = numPlayers.toString();
  numberOfPlayers.value = numPlayers;
}

async function getRaffleState() {
  if (!noRaffleAddress) {
    try {
      gettingLotteryState.value = true;
      const { contract } = await registerContract();
      let raffleState = await contract.getRaffleState();
      raffleState = raffleState.toString();
      if (raffleState === "0") {
        isLotteryOpen.value = true;
      } else {
        isLotteryOpen.value = false;
      }
    } catch (e) {
      console.log(e);
    } finally {
      gettingLotteryState.value = false;
    }
  } else {
    gettingLotteryState.value = false;
  }
}

async function getRecentWinner() {
  const { contract } = await registerContract();
  let recentWin = await contract.getRecentWinner();
  recentWinner.value = recentWin;
}

async function enterRaffle() {
  if (isLotteryOpen.value) {
    const { contract, provider } = await registerContract();
    const entranceFee = await getEntranceFee();
    try {
      loading.value = true;
      const transactionResponse = await contract.enterRaffle({
        value: ethers.utils.parseEther(`${entranceFee}`),
      });
      await listenForTransactionMine(transactionResponse, provider);
      await getBalance();
      await getNumOfPlayers();
      await getRaffleState();
      await getRecentWinner();
      $toast.open({
        message: "You have entered the raffle successfully",
        type: "success",
      });
    } catch (e) {
      console.log(e);
    }
    loading.value = false;
  } else {
    $toast.open({
      message: "Lottery is closed currently",
      type: "error",
    });
  }
}

watch(isConnected, async () => {
  if (isConnected.value) {
    await getBalance();
    await getNumOfPlayers();
    await getRaffleState();
    await getRecentWinner();
  } else {
    userBalance.value = null;
  }
});

onBeforeMount(async () => {
  if (isConnected.value) {
    await getBalance();
    await getEntranceFee();
    await getNumOfPlayers();
    await getRaffleState();
    await getRecentWinner();
  } else {
    userBalance.value = null;
  }
});
</script>

<template>
  <main>
    <header
      class="flex items-center justify-between p-5 border boder-gray-300 shadow-2xl"
    >
      <h1 class="text-xl text-gray-900 font-semibold">
        Smart Contract Lottery
      </h1>
      <div
        class="flex items-center"
        :class="isConnected ? 'border border-gray-300 rounded-xl' : ''"
      >
        <w3m-button balance="hide" />
        <p v-if="userBalance" class="pr-5">
          {{ userBalance.toFixed(3) + " ETH" }}
        </p>
      </div>
    </header>
    <section class="min-h-[80vh] flex flex-col items-center justify-center">
      <div
        class="min-h-[50vh] flex items-center justify-center"
        v-if="!isConnected"
      >
        <p class="text-gray-900 font-bold text-lg text-center uppercase">
          Pls connect to a wallet!
        </p>
      </div>
      <div
        v-if="gettingLotteryState && isConnected"
        class="min-h-[50vh] flex flex-col gap-4 items-center justify-center"
      >
        <p class="text-gray-900 font-bold text-lg text-center uppercase">
          Checking if lottery is open or not....
        </p>
      </div>
      <div
        v-if="!gettingLotteryState && isConnected"
        class="min-h-[50vh] w-[80%] md:w-[50%] mx-auto bg-gray-200 flex flex-col gap-4 justify-center px-5"
      >
        <p class="text-lg font-medium">
          Entrance Fee: {{ raffleEntranceFee }} ETH
        </p>
        <p v-if="numberOfPlayers" class="text-lg font-medium">
          No. Of Players: {{ numberOfPlayers }}
        </p>
        <p v-if="recentWinner" class="text-lg font-medium">
          Recent winner: {{ recentWinner }}
        </p>

        <button
          @click="enterRaffle"
          :disabled="loading"
          class="bg-blue-500 text-white p-3 rounded flex items-center gap-1 self-start"
        >
          {{ loading ? "Entering...." : "Enter raffle" }}
          <p
            v-if="loading"
            class="animate-spin spinner-border h-5 w-5 border-b-2 rounded-full"
          ></p>
        </button>
      </div>
      <div
        v-if="noRaffleAddress && isConnected && !gettingLotteryState"
        class="min-h-[50vh] flex flex-col gap-4 items-center justify-center"
      >
        <p class="text-gray-900 font-bold text-lg text-center uppercase">
          No raffle address detected
        </p>
      </div>
    </section>
  </main>
</template>
