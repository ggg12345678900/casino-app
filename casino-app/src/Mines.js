import React, { useState, useEffect } from 'react';

const GRID_SIZE = 25;

function Mines({ balance, setBalance, addResult }) {
  const [bet, setBet] = useState(10);
  const [mineCount, setMineCount] = useState(3);
  const [gameActive, setGameActive] = useState(false);
  const [grid, setGrid] = useState(Array(GRID_SIZE).fill(null)); // null=hidden, 'gem'=safe, 'mine'=mine
  const [mines, setMines] = useState([]);
  const [revealed, setRevealed] = useState([]);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [currentMultiplier, setCurrentMultiplier] = useState(1);

  const safeCount = GRID_SIZE - mineCount;

  const calcMultiplier = (revealedCount) => {
    let mult = 1;
    for (let i = 0; i < revealedCount; i++) {
      mult *= (GRID_SIZE - mineCount - i) / (GRID_SIZE - i);
    }
    return parseFloat((0.99 / mult).toFixed(4));
  };

  const profit = ((bet * currentMultiplier) - bet).toFixed(2);

  const startGame = () => {
    if (bet > balance || bet <= 0) return;
    setBalance(prev => parseFloat((prev - bet).toFixed(2)));

    // Place mines randomly
    const minePositions = [];
    while (minePositions.length < mineCount) {
      const pos = Math.floor(Math.random() * GRID_SIZE);
      if (!minePositions.includes(pos)) minePositions.push(pos);
    }

    setMines(minePositions);
    setRevealed([]);
    setGrid(Array(GRID_SIZE).fill(null));
    setGameActive(true);
    setGameOver(false);
    setWon(false);
    setCurrentMultiplier(calcMultiplier(0));
  };

  const revealCell = (index) => {
    if (!gameActive || revealed.includes(index) || gameOver) return;

    if (mines.includes(index)) {
      // Hit a mine!
      const newGrid = Array(GRID_SIZE).fill(null);
      mines.forEach(m => newGrid[m] = 'mine');
      revealed.forEach(r => newGrid[r] = 'gem');
      newGrid[index] = 'mine-hit';
      setGrid(newGrid);
      setGameOver(true);
      setGameActive(false);
    } else {
      const newRevealed = [...revealed, index];
      setRevealed(newRevealed);
      const newGrid = Array(GRID_SIZE).fill(null);
      newRevealed.forEach(r => newGrid[r] = 'gem');
      setGrid(newGrid);
      const newMult = calcMultiplier(newRevealed.length);
      setCurrentMultiplier(newMult);

      // Auto cashout if all safe cells revealed
      if (newRevealed.length === safeCount) {
        cashOut(newMult, newRevealed);
      }
    }
  };

const cashOut = (mult = currentMultiplier, rev = revealed) => {
    if (!gameActive || rev.length === 0) return;
    const winAmount = parseFloat((bet * mult).toFixed(2));
    const profitAmount = parseFloat((winAmount - bet).toFixed(2));
    setBalance(prev => parseFloat((prev + winAmount).toFixed(2)));
    addResult(true, profitAmount);
    setWon(true);
    setGameActive(false);
    setGameOver(true);

    // Reveal all mines
    const newGrid = Array(GRID_SIZE).fill(null);
    mines.forEach(m => newGrid[m] = 'mine');
    rev.forEach(r => newGrid[r] = 'gem');
    setGrid(newGrid);
  };

  const getCellStyle = (index, type) => {
    const base = {
      width: '100%', aspectRatio: '1', border: 'none', borderRadius: '8px',
      cursor: gameActive && !revealed.includes(index) ? 'pointer' : 'default',
      fontSize: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center',
      transition: 'all 0.15s', fontWeight: 'bold'
    };

    if (type === 'gem') return { ...base, backgroundColor: '#1a6b3c', boxShadow: '0 0 10px #00e70155' };
    if (type === 'mine') return { ...base, backgroundColor: '#3a1a1a' };
    if (type === 'mine-hit') return { ...base, backgroundColor: '#ff4444', boxShadow: '0 0 15px #ff444488' };
    return { ...base, backgroundColor: '#2d4a5a', ':hover': { backgroundColor: '#3a5a6a' } };
  };

  const getCellContent = (type) => {
    if (type === 'gem') return '💎';
    if (type === 'mine' || type === 'mine-hit') return '💣';
    return '';
  };

  return (
    <div style={{ display: 'flex', gap: '20px', padding: '30px' }}>

      {/* Left Panel */}
      <div style={{ width: '220px', backgroundColor: '#1a2c38', borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* Bet */}
        <div>
          <label style={{ color: '#8a9bb0', fontSize: '12px', display: 'block', marginBottom: '6px' }}>EINSATZ</label>
          <div style={{ position: 'relative' }}>
            <input type="number" value={bet} onChange={e => setBet(parseFloat(e.target.value))} disabled={gameActive}
              style={{ width: '100%', padding: '10px', paddingRight: '60px', backgroundColor: '#0f1923', border: '1px solid #2d4a5a', color: 'white', borderRadius: '8px', fontSize: '16px', boxSizing: 'border-box', opacity: gameActive ? 0.5 : 1 }} />
            <div style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: '4px' }}>
              <button onClick={() => setBet(prev => parseFloat((prev / 2).toFixed(2)))} disabled={gameActive}
                style={{ backgroundColor: '#2d4a5a', border: 'none', color: '#8a9bb0', borderRadius: '4px', padding: '2px 6px', cursor: 'pointer', fontSize: '12px' }}>½</button>
              <button onClick={() => setBet(prev => parseFloat((prev * 2).toFixed(2)))} disabled={gameActive}
                style={{ backgroundColor: '#2d4a5a', border: 'none', color: '#8a9bb0', borderRadius: '4px', padding: '2px 6px', cursor: 'pointer', fontSize: '12px' }}>2x</button>
            </div>
          </div>
        </div>

        {/* Mine Count */}
        <div>
          <label style={{ color: '#8a9bb0', fontSize: '12px', display: 'block', marginBottom: '6px' }}>MINEN: {mineCount}</label>
          <input type="range" min="1" max="24" value={mineCount} onChange={e => setMineCount(parseInt(e.target.value))} disabled={gameActive}
            style={{ width: '100%', cursor: gameActive ? 'not-allowed' : 'pointer', accentColor: '#00e701' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#8a9bb0', fontSize: '11px' }}>
            <span>1</span><span>24</span>
          </div>
        </div>

        {/* Multiplier */}
        <div>
          <label style={{ color: '#8a9bb0', fontSize: '12px', display: 'block', marginBottom: '6px' }}>AKTUELLER MULTIPLIER</label>
          <div style={{ padding: '10px', backgroundColor: '#0f1923', border: '1px solid #2d4a5a', borderRadius: '8px', color: '#00e701', fontSize: '18px', fontWeight: 'bold', textAlign: 'center' }}>
            {currentMultiplier}x
          </div>
        </div>

        {/* Profit */}
        {gameActive && revealed.length > 0 && (
          <div>
            <label style={{ color: '#8a9bb0', fontSize: '12px', display: 'block', marginBottom: '6px' }}>GEWINN BEI CASHOUT</label>
            <div style={{ padding: '10px', backgroundColor: '#0f1923', border: '1px solid #00e701', borderRadius: '8px', color: '#00e701', fontSize: '16px', textAlign: 'center' }}>
              +{profit} €
            </div>
          </div>
        )}

        {/* Button */}
        {!gameActive ? (
          <button onClick={startGame} disabled={bet > balance || bet <= 0}
            style={{ padding: '14px', backgroundColor: '#00e701', border: 'none', color: '#000', borderRadius: '8px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' }}>
            💣 Spiel starten
          </button>
        ) : (
          <button onClick={() => cashOut()} disabled={revealed.length === 0}
            style={{ padding: '14px', backgroundColor: revealed.length > 0 ? '#f5a623' : '#555', border: 'none', color: '#000', borderRadius: '8px', cursor: revealed.length > 0 ? 'pointer' : 'not-allowed', fontSize: '16px', fontWeight: 'bold' }}>
            💰 Cash Out ({(bet * currentMultiplier).toFixed(2)})
          </button>
        )}

        {/* Result Message */}
        {gameOver && (
          <div style={{ textAlign: 'center', fontSize: '16px', fontWeight: 'bold', color: won ? '#00e701' : '#ff4444', padding: '10px', backgroundColor: won ? '#00e70122' : '#ff444422', borderRadius: '8px' }}>
            {won ? `🎉 +${(bet * currentMultiplier - bet).toFixed(2)} €!` : '💥 Mine getroffen!'}
          </div>
        )}
      </div>

      {/* Grid */}
      <div style={{ flex: 1, backgroundColor: '#1a2c38', borderRadius: '12px', padding: '30px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <h2 style={{ margin: '0 0 20px 0', color: '#8a9bb0' }}>💣 Mines</h2>

        {!gameActive && !gameOver && (
          <p style={{ color: '#8a9bb0', marginBottom: '20px' }}>Starte ein Spiel um zu beginnen!</p>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', width: '100%', maxWidth: '400px' }}>
          {Array(GRID_SIZE).fill(null).map((_, index) => (
            <button key={index} onClick={() => revealCell(index)}
              style={getCellStyle(index, grid[index])}>
              {getCellContent(grid[index])}
            </button>
          ))}
        </div>

        {gameActive && (
          <div style={{ marginTop: '20px', color: '#8a9bb0', fontSize: '14px' }}>
            {revealed.length} von {safeCount} sicheren Feldern aufgedeckt
          </div>
        )}
      </div>
    </div>
  );
}

export default Mines;