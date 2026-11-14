# Dreamy ambient pad + soft bell arpeggio, procedural. usage: music.py out.wav seconds seed mood
import sys, numpy as np, wave
out, dur, seed, mood = sys.argv[1], float(sys.argv[2]), int(sys.argv[3]), sys.argv[4]
sr = 44100; n = int(sr*dur); t = np.arange(n)/sr
rng = np.random.default_rng(seed)
def midi(m): return 440*2**((m-69)/12)
progs = {
 'night': [[50,57,62,65,69],[46,53,58,62,65],[43,50,55,58,62],[45,52,57,61,64]],   # Dm Bb Gm A
 'warm':  [[48,55,60,64,67],[45,52,57,60,64],[41,48,53,57,60],[43,50,55,59,62]],   # C Am F G
 'dawn':  [[53,60,65,69,72],[50,57,62,65,69],[46,53,58,62,65],[48,55,60,64,67]],   # F Dm Bb C
}[mood]
L = np.zeros(n); R = np.zeros(n)
chord_len = 6.0
nch = int(np.ceil(dur/chord_len))+1
for i in range(nch):
    c = progs[i % 4]; s0 = i*chord_len - 1.0
    a = int(max(0,s0)*sr); b = min(n, int((s0+chord_len+2.5)*sr))
    if a >= n: break
    tt = (np.arange(a,b)/sr) - s0
    env = np.clip(tt/2.0,0,1) * np.clip((chord_len+2.5-tt)/2.5,0,1)
    for k,m in enumerate(c):
        f = midi(m)
        for det,pan in ((-0.12,0.2),(0.12,0.8)):
            ff = f*2**(det/12/8)
            sig = np.sin(2*np.pi*ff*tt + 0.6*np.sin(2*np.pi*ff*2*tt)*0.3) * (0.06 if k else 0.09)
            sig *= (1+0.15*np.sin(2*np.pi*0.2*tt+k))
            L[a:b] += sig*env*(1-pan); R[a:b] += sig*env*pan
# bell arpeggio
step = 0.75
for j in range(int(dur/step)):
    if rng.random() < 0.35: continue
    c = progs[int(j*step/chord_len) % 4]
    m = c[rng.integers(1,5)] + 12*(1 if rng.random()<0.6 else 2)
    st = j*step + 0.5; a = int(st*sr); b = min(n, a+int(3*sr))
    if a>=n: break
    tt = np.arange(b-a)/sr; f = midi(m)
    sig = (np.sin(2*np.pi*f*tt) + 0.3*np.sin(2*np.pi*f*2.01*tt))*np.exp(-tt*2.2)*0.035
    p = rng.random()
    L[a:b] += sig*(1-p); R[a:b] += sig*p
# simple feedback delay reverb
def verb(x):
    y = x.copy()
    for d,g in ((0.137,0.35),(0.231,0.3),(0.389,0.25),(0.53,0.2)):
        k=int(d*sr); y[k:] += g*x[:-k]
    return y
L, R = verb(L), verb(R[::-1])[::-1]*0 + verb(R)
# fade in/out
fade = np.clip(t/2.5,0,1)*np.clip((dur-t)/3.0,0,1)
L*=fade; R*=fade
m = max(np.abs(L).max(), np.abs(R).max()); L/=m*1.25; R/=m*1.25
data = (np.stack([L,R],1)*32767).astype(np.int16)
w = wave.open(out,'wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(sr); w.writeframes(data.tobytes()); w.close()
