'use client';

import { useEffect, useRef, useState } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { walletAtom, viviStateAtom } from '@/lib/atoms';
import { executeExternalCall } from '@/lib/utils';

export default function GamePage() {
    // Character position state (centered initially)
    const [pos, setPos] = useState({ x: 0, y: 0 });
    const [moving, setMoving] = useState(false);
    const [frame, setFrame] = useState(0); // 0: idle, 1: walk
    const [facingRight, setFacingRight] = useState(true); // true: right, false: left
    const [health, setHealth] = useState(10); // Player health
    const [damage, setDamage] = useState(0);
    const [maxHealth] = useState(10); // Maximum health for health bar
    const [room, setRoom] = useState(0); // Current room
    const [enemies, setEnemies] = useState<{ x: number; y: number; alive: boolean; hit?: boolean }[]>([]); // Enemies in room
    const [doorOpen, setDoorOpen] = useState(false); // Door state
    const [attacking, setAttacking] = useState(false); // Attack animation state
    const [showWalletTooltip, setShowWalletTooltip] = useState(false); // Wallet tooltip state
    const [damageFlash, setDamageFlash] = useState(false); // Damage flash effect
    const [showControls, setShowControls] = useState(true); // Show controls help
    const [loadingNextRoom, setLoadingNextRoom] = useState(false); // Loading state for room transition
    const gameAreaRef = useRef<HTMLDivElement>(null);
    const moveRef = useRef(false);
    const animationRef = useRef<NodeJS.Timeout | null>(null);

    // Get wallet and vivi state from global state
    const wallet = useAtomValue(walletAtom);
    const viviState = useAtomValue(viviStateAtom);
    const setViviState = useSetAtom(viviStateAtom);
    
    // Format wallet address for display
    const formattedWalletAddress = wallet?.address 
        ? `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`
        : '';

    // Initialize health and room from vivi state if available
    useEffect(() => {
        if (viviState) {
            setHealth(viviState.healthPoints);
            setRoom(viviState.room);
        }
    }, [viviState]);

    // Helper: spawn enemies for a room
    function spawnEnemies(room: number, area: HTMLDivElement | null) {
        const numEnemies = room === 0 ? 1 : Math.floor(Math.random() * room) + 1;
        if (!area) return [];
        const { offsetWidth, offsetHeight } = area;
        return Array.from({ length: numEnemies }, () => ({
            x: Math.random() * (offsetWidth - 128),
            y: Math.random() * (offsetHeight - 128),
            alive: true,
            hit: false,
        }));
    }

    // Set initial position and spawn enemies after mount or room change
    useEffect(() => {
        const area = gameAreaRef.current;
        if (area) {
            setPos({ x: area.offsetWidth / 2 - 64, y: area.offsetHeight / 2 - 64 });
            setEnemies(spawnEnemies(room, area));
            setDoorOpen(false);
        }
    }, [room]);

    // Auto-hide controls after 5 seconds
    useEffect(() => {
        const timer = setTimeout(() => {
            setShowControls(false);
        }, 5000);
        return () => clearTimeout(timer);
    }, []);

    // Attack function
    const handleAttack = () => {
        if (attacking) return; // Prevent spamming attacks

        setAttacking(true);
        setTimeout(() => setAttacking(false), 200); // Attack animation duration

        setEnemies((prevEnemies) => {
            let hitIndexes: number[] = [];
            const updated = prevEnemies.map((enemy, i) => {
                if (!enemy.alive) return enemy;

                // Calculate attack range based on facing direction
                const attackRange = 80;
                const attackX = facingRight ? pos.x + 64 : pos.x - attackRange;
                const attackWidth = attackRange;

                // Check if enemy is in attack range
                const inXRange = facingRight
                    ? enemy.x + 32 >= pos.x + 64 && enemy.x + 32 <= pos.x + 64 + attackRange
                    : enemy.x + 32 <= pos.x && enemy.x + 32 >= pos.x - attackRange;

                const inYRange = enemy.y + 32 >= pos.y && enemy.y + 32 <= pos.y + 128;

                if (inXRange && inYRange) {
                    hitIndexes.push(i);
                    return { ...enemy, hit: true };
                }
                return enemy;
            });

            if (hitIndexes.length > 0) {
                setTimeout(() => {
                    setEnemies((enemiesNow) =>
                        enemiesNow.map((enemy, i) =>
                            hitIndexes.includes(i) ? { ...enemy, alive: false, hit: false } : enemy
                        )
                    );
                }, 200);
            }
            return updated;
        });
    };

    // WASD movement and animation
    useEffect(() => {
        function handleKeyDown(e: KeyboardEvent) {
            let moved = false;
            setPos((prev) => {
                const step = 16;
                let { x, y } = prev;
                if (e.key === 'w' || e.key === 'W') { y -= step; moved = true; }
                if (e.key === 's' || e.key === 'S') { y += step; moved = true; }
                if (e.key === 'a' || e.key === 'A') { x -= step; moved = true; setFacingRight(false); }
                if (e.key === 'd' || e.key === 'D') { x += step; moved = true; setFacingRight(true); }
                if (e.key === ' ') { handleAttack(); }
                return { x, y };
            });
            if (moved) {
                setMoving(true);
                moveRef.current = true;
                setShowControls(false); // Hide controls when player starts moving
            }
        }

        function handleKeyUp(e: KeyboardEvent) {
            moveRef.current = false;
            setMoving(false);
        }

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [pos, facingRight, attacking]);

    // Animation loop
    useEffect(() => {
        if (moving) {
            animationRef.current = setInterval(() => {
                setFrame((f) => (f === 0 ? 1 : 0));
            }, 120);
        } else {
            setFrame(0);
            if (animationRef.current) clearInterval(animationRef.current);
        }
        return () => {
            if (animationRef.current) clearInterval(animationRef.current);
        };
    }, [moving]);

    // Enemy movement and collision
    useEffect(() => {
        if (enemies.length === 0 || health <= 0) return;
        const interval = setInterval(() => {
            setEnemies((prev) =>
                prev.map((enemy) => {
                    if (!enemy.alive) return enemy;
                    // Move enemy toward player
                    const dx = pos.x - enemy.x;
                    const dy = pos.y - enemy.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 1) return enemy; // Already at player
                    const speed = 12; // Enemy speed per tick
                    return {
                        ...enemy,
                        x: enemy.x + (dx / dist) * Math.min(speed, dist),
                        y: enemy.y + (dy / dist) * Math.min(speed, dist),
                    };
                })
            );
            // Check collision and apply damage
            setEnemies((prev) => {
                let damaged = false;
                const updated = prev.map((enemy) => {
                    if (!enemy.alive) return enemy;
                    const dx = pos.x - enemy.x;
                    const dy = pos.y - enemy.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < 48 && !damaged) {
                        damaged = true;
                        setHealth((h) => Math.max(0, h - 1));
                        // Trigger damage flash
                        setDamage(damage + 1);
                        setDamageFlash(true);
                        setTimeout(() => setDamageFlash(false), 200);
                    }
                    return enemy;
                });
                return updated;
            });
        }, 200);
        return () => clearInterval(interval);
    }, [enemies, pos, health]);

    // Open door if all enemies are dead
    useEffect(() => {
        if (enemies.length > 0 && enemies.every((e) => !e.alive)) {
            setDoorOpen(true);
        }
    }, [enemies]);

    // Progress to next room when touching door
    const handleNextRoom = async () => {
        setLoadingNextRoom(true);
        try {
            await fetch('/api/external', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    network: 'sepolia',
                    calls: [{
                        contractAddress: wallet?.vivi || "",
                        entrypoint: 'next_room',
                        calldata: [
                            damage.toString(),
                            '0'
                        ],
                    }],
                    address: wallet?.address || "",
                    hashedPk: wallet?.pk || ""
                }),
            });
            setRoom(room + 1);
            // Update vivi state with new room and health
            if (viviState) {
                setViviState({
                    ...viviState,
                    healthPoints: health - damage,
                    room: room + 1,
                });
            }
        } catch (error) {
            console.error('Failed to call /api/external:', error);
        } finally {
            setLoadingNextRoom(false);
        }
    };

    // Check door collision
    useEffect(() => {
        if (doorOpen && pos.x <= 40 && pos.y >= window.innerHeight * 0.4 - 40 && pos.y <= window.innerHeight * 0.4 + 40) {
            handleNextRoom();
        }
    }, [pos, doorOpen]);

    // Handle game restart with Space key
    useEffect(() => {
        function handleGameRestart(e: KeyboardEvent) {
            if (health <= 0 && e.code === 'Space') {
                e.preventDefault();
                // Reset game state
                setHealth(maxHealth);
                setRoom(0);
                setPos({ x: 0, y: 0 }); // Will be set properly in the room effect
                setEnemies([]);
                setDoorOpen(false);
                setAttacking(false);
                setMoving(false);
                setFrame(0);
                setFacingRight(true);
                setDamageFlash(false);
                setShowControls(true);
            }
        }

        window.addEventListener('keydown', handleGameRestart);
        return () => window.removeEventListener('keydown', handleGameRestart);
    }, [health, maxHealth]);

    // Render
    return (
        <div
            ref={gameAreaRef}
            style={{
                position: 'relative',
                width: '100vw',
                height: '100vh',
                overflow: 'hidden',
                background: "url('/images/background.png') center center / cover no-repeat, #000"
            }}
        >
            {/* Loading Overlay for Room Transition */}
            {loadingNextRoom && (
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100vw',
                    height: '100vh',
                    background: 'rgba(0,0,0,0.7)',
                    backdropFilter: 'blur(5px)',
                    zIndex: 20,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}>
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 24,
                    }}>
                        <div style={{
                            width: 80,
                            height: 80,
                            border: '8px solid rgba(255,255,255,0.1)',
                            borderTopColor: '#4ade80',
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite',
                        }} />
                        <div style={{
                            color: '#fff',
                            fontSize: 24,
                            fontWeight: 'bold',
                            textAlign: 'center',
                            textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                        }}>
                            Entering Room {room + 2}...
                        </div>
                        <div style={{
                            color: 'rgba(255,255,255,0.7)',
                            fontSize: 14,
                            maxWidth: 300,
                            textAlign: 'center',
                        }}>
                            Processing blockchain transaction for your progress
                        </div>
                    </div>
                </div>
            )}

            {/* Damage Flash Overlay */}
            {damageFlash && (
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100vw',
                    height: '100vh',
                    background: 'rgba(255,0,0,0.3)',
                    zIndex: 8,
                    pointerEvents: 'none',
                    animation: 'flash 0.2s forwards',
                }} />
            )}

            {/* Game Over Overlay */}
            {health <= 0 && (
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100vw',
                    height: '100vh',
                    background: 'rgba(0,0,0,0.9)',
                    backdropFilter: 'blur(10px)',
                    zIndex: 10,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    animation: 'fadeIn 0.5s ease-out',
                }}>
                    <div style={{
                        textAlign: 'center',
                        background: 'rgba(255,255,255,0.1)',
                        padding: '40px 60px',
                        borderRadius: '20px',
                        border: '2px solid rgba(255,255,255,0.2)',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
                    }}>
                        <h1 style={{
                            color: '#fff',
                            fontSize: 64,
                            marginBottom: 20,
                            textShadow: '0 4px 8px rgba(0,0,0,0.5)',
                            animation: 'pulse 2s infinite',
                        }}>Game Over</h1>
                        <p style={{
                            color: '#fff',
                            fontSize: 24,
                            opacity: 0.8,
                            marginBottom: 20,
                        }}>You lost all your health!</p>
                        <div style={{
                            background: 'rgba(255,255,255,0.1)',
                            padding: '12px 24px',
                            borderRadius: '10px',
                            border: '1px solid rgba(255,255,255,0.2)',
                        }}>
                            <p style={{ color: '#fff', fontSize: 16, margin: 0 }}>
                                Press SPACE to restart
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Header UI */}
            <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '100px',
                background: 'linear-gradient(180deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 70%, transparent 100%)',
                zIndex: 4,
                pointerEvents: 'none',
            }} />

            {/* Logo */}
            <h1 className="viving-logo" style={{
                fontSize: 48,
                marginBottom: 32,
                letterSpacing: 2,
                position: 'absolute',
                top: 24,
                left: 24,
                zIndex: 5,
                textShadow: '0 2px 4px rgba(0,0,0,0.8)',
                pointerEvents: 'none',
            }}>VIVING</h1>

            {/* Health Bar - now next to logo */}
            <div style={{
                position: 'absolute',
                top: 24,
                left: 180, // 24 (logo left) + ~140 (logo width + margin)
                zIndex: 5,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: 8,
            }}>
                <div style={{
                    color: '#fff',
                    fontSize: 16,
                    fontWeight: 'bold',
                    textShadow: '0 2px 4px rgba(0,0,0,0.8)',
                }}>
                    Health
                </div>
                <div style={{
                    background: 'rgba(0,0,0,0.7)',
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderRadius: '20px',
                    padding: '6px',
                    width: '200px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                }}>
                    <div style={{
                        background: health > 3 ? 'linear-gradient(90deg, #4ade80, #22c55e)' :
                            health > 1 ? 'linear-gradient(90deg, #fbbf24, #f59e0b)' :
                                'linear-gradient(90deg, #ef4444, #dc2626)',
                        height: '100%',
                        width: `${(health / maxHealth) * 100}%`,
                        borderRadius: '14px',
                        transition: 'all 0.3s ease',
                        boxShadow: health > 0 ? '0 0 10px rgba(255,255,255,0.3)' : 'none',
                    }} />
                    <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        color: '#fff',
                        fontSize: 12,
                        fontWeight: 'bold',
                        textShadow: '0 1px 2px rgba(0,0,0,0.8)',
                    }}>
                        {health}/{maxHealth}
                    </div>
                </div>
            </div>

            {/* Room Counter */}
            <div style={{
                position: 'absolute',
                top: 24,
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(0,0,0,0.7)',
                border: '2px solid rgba(255,255,255,0.3)',
                borderRadius: '20px',
                padding: '8px 20px',
                color: '#fff',
                fontSize: 18,
                fontWeight: 'bold',
                zIndex: 5,
                pointerEvents: 'none',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            }}>
                Room {room + 1}
            </div>

            {/* Wallet Button */}
            {wallet && (
                <div style={{ position: 'absolute', top: 24, right: 24, zIndex: 5, display: 'flex', gap: 16 }}>
                    <div style={{
                        background: 'rgba(0,0,0,0.7)',
                        border: '2px solid rgba(255,255,255,0.3)',
                        borderRadius: '12px',
                        padding: '12px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        color: '#fff',
                        fontSize: 16,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
                            <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
                            <path d="M18 12a2 2 0 0 0-2 2v4h4v-4a2 2 0 0 0-2-2z" />
                        </svg>
                        {formattedWalletAddress}
                    </div>
                    
                    <button
                        style={{
                            background: 'rgba(0,0,0,0.7)',
                            border: '2px solid rgba(255,255,255,0.3)',
                            borderRadius: '12px',
                            padding: '12px 16px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            transition: 'all 0.3s ease',
                            color: '#fff',
                            fontSize: 16,
                            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                        }}
                        onMouseEnter={() => setShowWalletTooltip(true)}
                        onMouseLeave={() => setShowWalletTooltip(false)}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                            <line x1="12" y1="17" x2="12.01" y2="17" />
                        </svg>
                        Info
                    </button>
                    
                    {/* Wallet Info Tooltip */}
                    {showWalletTooltip && (
                        <div style={{
                            position: 'absolute',
                            top: '100%',
                            right: 0,
                            background: 'rgba(0,0,0,0.95)',
                            color: '#fff',
                            padding: '16px 20px',
                            borderRadius: '12px',
                            fontSize: 14,
                            zIndex: 10,
                            marginTop: 12,
                            border: '1px solid rgba(255,255,255,0.2)',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
                            animation: 'slideDown 0.2s ease-out',
                            width: 320,
                        }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                <div>
                                    <div style={{ fontWeight: 'bold', marginBottom: 4, opacity: 0.8 }}>Wallet Address:</div>
                                    <div style={{
                                        fontFamily: 'monospace',
                                        fontSize: 12,
                                        wordBreak: 'break-all',
                                        background: 'rgba(255,255,255,0.1)',
                                        padding: '8px 12px',
                                        borderRadius: '6px',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                    }}>
                                        {wallet.address}
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontWeight: 'bold', marginBottom: 4, opacity: 0.8 }}>Contract Address:</div>
                                    <div style={{
                                        fontFamily: 'monospace',
                                        fontSize: 12,
                                        wordBreak: 'break-all',
                                        background: 'rgba(255,255,255,0.1)',
                                        padding: '8px 12px',
                                        borderRadius: '6px',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                    }}>
                                        {wallet.vivi}
                                    </div>
                                </div>
                            </div>
                            {/* Tooltip Arrow */}
                            <div style={{
                                position: 'absolute',
                                top: '-8px',
                                right: 24,
                                width: 0,
                                height: 0,
                                borderLeft: '8px solid transparent',
                                borderRight: '8px solid transparent',
                                borderBottom: '8px solid rgba(0,0,0,0.95)',
                            }} />
                        </div>
                    )}
                </div>
            )}

            {/* Controls Help */}
            {showControls && (
                <div style={{
                    position: 'absolute',
                    bottom: 40,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'rgba(0,0,0,0.8)',
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderRadius: '16px',
                    padding: '20px 30px',
                    color: '#fff',
                    fontSize: 16,
                    zIndex: 5,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                    animation: 'slideUp 0.5s ease-out',
                }}>
                    <div style={{ textAlign: 'center', marginBottom: 12, fontWeight: 'bold' }}>
                        🎮 Controls
                    </div>
                    <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                            <div style={{ fontSize: 14, opacity: 0.8 }}>Move</div>
                            <div style={{ display: 'flex', gap: 4 }}>
                                {['W', 'A', 'S', 'D'].map(key => (
                                    <div key={key} style={{
                                        background: 'rgba(255,255,255,0.2)',
                                        border: '1px solid rgba(255,255,255,0.3)',
                                        borderRadius: '6px',
                                        padding: '4px 8px',
                                        fontSize: 12,
                                        fontWeight: 'bold',
                                        minWidth: '24px',
                                        textAlign: 'center',
                                    }}>
                                        {key}
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div style={{ width: '1px', height: '40px', background: 'rgba(255,255,255,0.3)' }} />
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                            <div style={{ fontSize: 14, opacity: 0.8 }}>Attack</div>
                            <div style={{
                                background: 'rgba(255,255,255,0.2)',
                                border: '1px solid rgba(255,255,255,0.3)',
                                borderRadius: '6px',
                                padding: '4px 12px',
                                fontSize: 12,
                                fontWeight: 'bold',
                            }}>
                                SPACE
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Enemies */}
            {enemies.map((enemy, i) =>
                enemy.alive || enemy.hit ? (
                    <img
                        key={i}
                        src="/images/vivi-1.png"
                        alt="Enemy"
                        style={{
                            position: 'absolute',
                            left: enemy.x,
                            top: enemy.y,
                            width: 64,
                            height: 64,
                            zIndex: 2,
                            filter: enemy.hit ?
                                'hue-rotate(0deg) brightness(2) sepia(1) saturate(10) contrast(2) drop-shadow(0 0 10px #ff0000)' :
                                'hue-rotate(120deg) brightness(0.8) drop-shadow(0 2px 4px rgba(0,0,0,0.5))',
                            opacity: 0.9,
                            pointerEvents: 'none',
                            transition: 'filter 0.1s, transform 0.1s',
                            transform: enemy.hit ? 'scale(1.3) rotate(5deg)' : 'scale(1)',
                        }}
                        draggable={false}
                    />
                ) : null
            )}

            {/* Player */}
            <img
                src={frame === 0 ? "/images/vivi.png" : "/images/vivi-1.png"}
                alt="Main Character"
                style={{
                    position: 'absolute',
                    left: pos.x,
                    top: pos.y,
                    width: 128,
                    height: 128,
                    transition: 'left 0.05s, top 0.05s',
                    zIndex: 2,
                    userSelect: 'none',
                    pointerEvents: 'none',
                    transform: facingRight ? 'scaleX(-1)' : 'scaleX(1)',
                    filter: damageFlash ? 'brightness(2) saturate(0) contrast(2)' : 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))',
                }}
                draggable={false}
            />

            {/* Attack Slash Effect */}
            {attacking && (
                <img
                    src="/images/slash.png"
                    alt="Slash"
                    style={{
                        position: 'absolute',
                        left: facingRight ? pos.x + 64 : pos.x - 80,
                        top: pos.y,
                        width: 80,
                        height: 128,
                        zIndex: 3,
                        pointerEvents: 'none',
                        transform: (facingRight ? 'scaleX(-1)' : 'scaleX(1)'),
                        opacity: 0.85,
                        transition: 'opacity 0.2s',
                        filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.8))',
                        animation: 'slash 0.2s forwards',
                    }}
                    draggable={false}
                />
            )}

            {/* Door */}
            {doorOpen && (
                <div style={{
                    position: 'absolute',
                    left: 0,
                    top: '40%',
                    width: 40,
                    height: 80,
                    background: 'linear-gradient(135deg, #444, #222)',
                    border: '4px solid #666',
                    borderRadius: '12px',
                    zIndex: 3,
                    boxShadow: '0 8px 16px rgba(0,0,0,0.5), inset 0 2px 4px rgba(255,255,255,0.1)',
                    animation: 'doorOpen 0.5s ease-out',
                }}>
                    <div style={{
                        position: 'absolute',
                        left: 60,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'rgba(0,0,0,0.8)',
                        color: '#fff',
                        padding: '8px 16px',
                        borderRadius: '20px',
                        fontSize: 14,
                        fontWeight: 'bold',
                        border: '2px solid rgba(255,255,255,0.3)',
                        whiteSpace: 'nowrap',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                        animation: 'pulse 2s infinite',
                    }}>
                        🚪 Next Room
                    </div>
                    {/* Door handle */}
                    <div style={{
                        position: 'absolute',
                        right: 8,
                        top: '45%',
                        width: 6,
                        height: 12,
                        background: '#888',
                        borderRadius: '3px',
                        boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.3)',
                    }} />
                </div>
            )}

            <style jsx>{`
                @keyframes flash {
                    0% { opacity: 0.5; }
                    100% { opacity: 0; }
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: scale(0.9); }
                    to { opacity: 1; transform: scale(1); }
                }
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.7; }
                }
                @keyframes slideDown {
                    from { opacity: 0; transform: translateX(-50%) translateY(-10px); }
                    to { opacity: 1; transform: translateX(-50%) translateY(0); }
                }
                @keyframes slideUp {
                    from { opacity: 0; transform: translateX(-50%) translateY(20px); }
                    to { opacity: 1; transform: translateX(-50%) translateY(0); }
                }
                @keyframes doorOpen {
                    from { transform: scaleY(0); opacity: 0; }
                    to { transform: scaleY(1); opacity: 1; }
                }
                @keyframes slash {
                    0% { opacity: 0; transform: ${facingRight ? 'scaleX(-1)' : 'scaleX(1)'} scale(0.8); }
                    50% { opacity: 1; transform: ${facingRight ? 'scaleX(-1)' : 'scaleX(1)'} scale(1.1); }
                    100% { opacity: 0; transform: ${facingRight ? 'scaleX(-1)' : 'scaleX(1)'} scale(1); }
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
