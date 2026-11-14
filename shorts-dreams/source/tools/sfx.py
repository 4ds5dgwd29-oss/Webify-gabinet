import sys, numpy as np, wave
out, dur = sys.argv[1], float(sys.argv[2]); cuts=[float(x) for x in sys.argv[3].split(',') if x]; alarm=sys.argv[4] if len(sys.argv)>4 else ''
sr=44100; n=int(sr*dur); L=np.zeros(n); R=np.zeros(n); rng=np.random.default_rng(1)
def whoosh(t0):
    d=0.55; m=int(d*sr); tt=np.arange(m)/sr
    noise=rng.standard_normal(m)
    # moving one-pole lowpass
    y=np.zeros(m); a0=0
    cut=0.02+0.25*np.sin(np.pi*tt/d)**2
    for i in range(m): a0+= cut[i]*(noise[i]-a0); y[i]=a0
    env=np.sin(np.pi*tt/d)**2*0.22
    a=int((t0-0.3)*sr); b=min(n,a+m)
    if a<0: return
    pan=np.linspace(0.2,0.8,m)[:b-a]
    L[a:b]+=y[:b-a]*env[:b-a]*(1-pan); R[a:b]+=y[:b-a]*env[:b-a]*pan
for c in cuts: whoosh(c)
if alarm:
    a0,a1=[float(x) for x in alarm.split('-')]
    t=a0
    while t<a1:
        for k in range(3):
            st=t+k*0.13; m=int(0.08*sr); tt=np.arange(m)/sr
            s=np.sign(np.sin(2*np.pi*2100*tt))*0.07*np.minimum(1,(m-np.arange(m))/200)
            a=int(st*sr); L[a:a+m]+=s; R[a:a+m]+=s
        t+=0.6
d=(np.stack([L,R],1)*32767).clip(-32767,32767).astype(np.int16)
w=wave.open(out,'wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(sr); w.writeframes(d.tobytes()); w.close()
