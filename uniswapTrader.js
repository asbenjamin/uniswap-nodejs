const { ethers } = require("ethers");
const {
  abi: UniswapV3PoolABI,
} = require("@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json");
const {
  abi: SwapRouterABI,
} = require("@uniswap/v3-periphery/artifacts/contracts/interfaces/ISwapRouter.sol/ISwapRouter.json");
const { getPoolImmutables, getPoolState } = require("./utils");
const ERC20ABI = require("./abi.json");

require("dotenv").config();
const INFURA_URL_TESTNET = process.env.INFURA_URL_TESTNET;
const WALLET_ADDRESS = process.env.WALLET_ADDRESS;
const WALLET_SECRET = process.env.WALLET_SECRET;

const provider = new ethers.JsonRpcProvider(INFURA_URL_TESTNET); // ropsten
// where can i find pool addresses manually
// UNI/ETH at https://info.uniswap.org/#/pools/0x1d42064fc4beb5f8aaf85f4617ae8b3b5b8bd801
const poolAddress =  "0x4D7C363DED4B3b4e1F954494d2Bc3955e49699cC"  //"0x1d42064fc4beb5f8aaf85f4617ae8b3b5b8bd801"; // UNI/WETH: in-wal/out-wal
const swapRouterAddress = "0xE592427A0AEce92De3Edee1F18E0157C05861564";

const name0 = "Wrapped Ether";
const symbol0 = "WETH";
const decimals0 = 18;
// 0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2
const address0 = "0xc778417e063141139fce010982780140aa0cd5ab"; // on ropsten

const name1 = "Uniswap Token";
const symbol1 = "UNI";
const decimals1 = 18;
const address1 = "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984";

async function main() {
  // for every pair and fee theres a pool with own address
  const poolContract = new ethers.Contract(
    poolAddress,
    UniswapV3PoolABI,
    provider
  );

  const immutables = await getPoolImmutables(poolContract);
  const state = await getPoolState(poolContract);

  const wallet = new ethers.Wallet(WALLET_SECRET);
  const connectedWallet = wallet.connect(provider);

  const swapRouterContract = new ethers.Contract(
    swapRouterAddress,
    SwapRouterABI,
    provider
  );

  //   https://eips.ethereum.org/EIPS/eip-20
  const inputAmount = 0.001;
  // .001 => 1 000 000 000 000 000
  const amountIn = ethers.utils.parseUnits(inputAmount.toString(), decimals0);

  const approvalAmount = (amountIn * 100000).toString();
  const tokenContract0 = new ethers.Contract(address0, ERC20ABI, provider);
  const approvalResponse = await tokenContract0
    .connect(connectedWallet)
    .approve(swapRouterAddress, approvalAmount);

  // https://docs.uniswap.org/contracts/v3/reference/periphery/SwapRouter#exactinputsingle
  // https://docs.uniswap.org/contracts/v3/reference/periphery/interfaces/ISwapRouter
  const params = {
    tokenIn: immutables.token1,
    tokenOut: immutables.token0,
    fee: immutables.fee,
    recipient: WALLET_ADDRESS,
    deadline: Math.floor(Date.now() / 1000) + 60 * 10,
    amountIn: amountIn,
    amountOutMinimum: 0,
    sqrtPriceLimitX96: 0,
  };

  const transaction = swapRouterContract
    .connect(connectedWallet)
    .exactInputSingle(params, {
      gasLimit: ethers.utils.hexlify(1000000),
    })
    .then((transaction) => {
      console.log(transaction);
    });
}

main();
