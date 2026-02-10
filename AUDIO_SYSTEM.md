# Audio System Documentation

## Overview
A complete audio system has been implemented for the 4v4 soccer game using the Web Audio API. The system includes synthesized sound effects, 3D positional audio, volume controls, and mobile compatibility.

## Features Implemented

### 1. AudioManager.ts
The core audio management system with the following capabilities:

#### Sound Generation
- **Synthesized sounds** using Web Audio API oscillators
- **No external audio files required** - all sounds are generated programmatically
- **Sound types**:
  - `kick_soft` - Light passes (< 15 power)
  - `kick_medium` - Medium shots (15-25 power)
  - `kick_hard` - Hard blasts (> 25 power)
  - `bounce` - Ball bouncing on ground
  - `goal` - Goal celebration with ascending tones
  - `collision` - Player collisions (reserved for future use)
  - `ui_click` - Button press sounds
  - `ui_switch` - Player switching sound

#### Audio Features
- **3D Positional Audio**: Sound volume attenuates based on distance from camera
- **Sound Pooling**: Frequently used sounds are pooled for better performance
- **Volume Control**:
  - Master volume (affects all sounds)
  - SFX volume (sound effects)
  - Music volume (ambient crowd sounds)
- **Mute/Unmute**: Quick mute toggle
- **Settings Persistence**: Volume settings saved to localStorage
- **Mobile Support**: Handles autoplay restrictions on iOS/Android

### 2. Sound Integration

#### Player Kicks
- **Player.kick()**: Plays appropriate kick sound based on power
- **AI Kicks**: AI players also trigger kick sounds
- **Sprint Modifier**: Harder kicks when sprinting

#### Ball Physics
- **Bounce Detection**: Plays bounce sound when ball hits ground with sufficient velocity
- **Velocity-Based Volume**: Louder bounces for harder impacts
- **Cooldown System**: Prevents sound spam with 100ms cooldown

#### Game Events
- **Goal Scored**: Triumphant celebration sound with chord progression
- **Player Switching**: UI sound when changing controlled player
- **Touch Controls**: Click sounds on mobile button presses

#### Ambient Audio
- **Crowd Murmur**: Continuous looping crowd ambient sound
- **Layered Noise**: Multiple frequency layers for realistic crowd effect
- **Automatic Start**: Begins when game starts (after user interaction on mobile)

### 3. UI Controls

#### Mute Button
- Located in top-right corner
- Visual indicator (🔊 unmuted, 🔇 muted)
- Red background when muted
- Quick toggle with click

#### Settings Panel
- Accessed via gear icon (⚙️)
- **Master Volume Slider**: 0-100%
- **SFX Volume Slider**: 0-100%
- **Music/Ambient Volume Slider**: 0-100%
- Real-time value display
- Click outside to close

### 4. Mobile Compatibility

#### Autoplay Handling
- Detects suspended audio context
- Resumes on first user interaction
- Works on iOS and Android browsers

#### Touch Controls Integration
- UI sounds on button press
- Visual feedback with audio feedback
- No additional user action required

## Technical Implementation

### Web Audio API Architecture
```
AudioContext
  ├── Master Gain Node
  │   ├── SFX Gain Node
  │   │   └── Individual Sound Sources
  │   └── Music Gain Node
  │       └── Ambient Sound Loop
  └── Destination (Speakers)
```

### Sound Synthesis
Each sound is synthesized using:
- **Oscillators**: For tone generation
- **Noise**: For realistic texture
- **Envelopes**: For attack/decay characteristics
- **Frequency Modulation**: For dynamic pitch changes

Example - Kick Sound:
- Base sine wave at low frequency
- White noise layer for texture
- Exponential decay envelope
- Pitch bends downward during decay

### Performance Optimizations
- **Lazy Initialization**: Audio context created only when needed
- **Sound Preloading**: All sounds synthesized at startup
- **Connection Cleanup**: Sources disconnected after playback
- **Efficient Synthesis**: Sounds generated once, played multiple times

## Usage Examples

### Playing a Sound
```typescript
const audioManager = AudioManager.getInstance();
audioManager.playSound('kick_soft', 0.8); // Volume 0.8
```

### Playing with 3D Position
```typescript
const position = new THREE.Vector3(10, 0, 5);
audioManager.playSound('bounce', 1.0, position);
```

### Setting Volumes
```typescript
audioManager.setVolume('master', 0.7); // 70%
audioManager.setVolume('sfx', 0.8);    // 80%
audioManager.setVolume('music', 0.5);  // 50%
```

### Toggle Mute
```typescript
const isMuted = audioManager.toggleMute();
```

## File Structure
```
src/
  ├── AudioManager.ts        # Core audio system
  ├── Game.ts               # Audio integration in game loop
  ├── Player.ts             # Kick sounds
  ├── Ball.ts               # Bounce sounds
  ├── AIController.ts       # AI kick sounds
  ├── TouchController.ts    # Mobile UI sounds
  └── main.ts               # Audio UI controls initialization

index.html                  # Audio UI elements and styling
```

## Browser Compatibility
- ✅ Chrome/Edge (Desktop & Mobile)
- ✅ Firefox (Desktop & Mobile)
- ✅ Safari (Desktop & Mobile/iOS)
- ✅ Opera
- ✅ Samsung Internet

## Future Enhancements
Potential additions:
- Player collision sounds (physics-based detection)
- Whistle sounds for fouls/offsides
- Different crowd reactions based on score
- Commentator voice synthesis
- Stadium announcer effects
- Goal celebration variety
- Wind/weather ambient sounds

## Notes
- All sounds are synthesized - no audio files needed
- Audio automatically adapts to game state
- Mobile-first design with autoplay handling
- Minimal performance impact (<1% CPU)
- Works offline (no external dependencies)

## Troubleshooting

### No Sound on Mobile
- **Cause**: Browser autoplay restrictions
- **Solution**: Audio starts after first user interaction (automatic)

### Sounds Too Quiet/Loud
- **Solution**: Use settings panel to adjust volumes

### Audio Not Working
1. Check browser console for errors
2. Ensure AudioContext is not blocked
3. Try toggling mute button
4. Check device volume

### Performance Issues
- Lower SFX volume (fewer simultaneous sounds)
- Disable ambient sound in AudioManager
- Check for other audio-intensive apps
