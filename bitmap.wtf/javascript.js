const io = require('socket.io-client');

const state = {
  countTotalBlocks: 0,
  countClaimedBlocks: 0,
  claimed: {},
};

const trac = io('https://bitmap.trac.network', {
  autoConnect: true,
  reconnection: true,
  reconnectionDelay: 500,
  reconnectionDelayMax: 500,
  randomizationFactor: 0,
});

trac.on('response', (response) => {
  if (response.func === 'latestBlock') {
    state.countTotalBlocks = response.result;
  } else if (response.func === 'bitmapsLength') {
    state.countClaimedBlocks = response.result;
  } else if (response.func === 'inscribedBitmaps') {
    Object.assign(
      state.claimed,
      Object.fromEntries(
        Object.entries(response.result).map(([key, value]) => {
          return [key, !!value];
        })
      )
    );
  }
  
  const claimedBlocks = Object.entries(state.claimed)
    .filter(([_, value]) => value)
    .map(([key, _]) => Number(key));

  const availableBlocksCount = state.countTotalBlocks - state.countClaimedBlocks;

  console.log('Claimed Blocks:', claimedBlocks);
  console.log('Available Blocks Count:', availableBlocksCount);
});

trac.on('connect', () => {
  trac.emit('get', {
    func: 'latestBlock',
    args: [],
    call_id: '',
  });

  trac.emit('get', {
    func: 'bitmapsLength',
    args: [],
    call_id: '',
  });

  // Include this if you want to retrieve inscribed bitmaps as well.
  // You need to provide the correct block numbers in the array.
  // trac.emit('get', {
  //   func: 'inscribedBitmaps',
  //   args: [[1, 2, 3, 4, 5]], // Replace with your own block numbers
  //   call_id: '',
  // });
});
