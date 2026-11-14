import json,sys,re
segs_txt = ["You skipped one night of sleep.","Here's what's happening inside your brain.","Sixteen hours awake.","Everything still feels normal.","Nineteen hours.","Your reactions have slowed about as much as if you'd had a drink or two.","Twenty-one hours.","Your brain starts forcing tiny shutdowns, called microsleeps.","A few seconds where you're simply...","gone.","Even with your eyes open.","Twenty-four hours.","Your reaction time now looks similar to being legally drunk.","And your amygdala, the brain's alarm system, can react around sixty percent more strongly.","Small problems start to feel huge.","The good news?","A full night of sleep undoes most of it.","So tonight...","let your brain do its job."]
sil=[l.split() for l in open(sys.argv[1]).read().strip().splitlines()]
starts=[0.0]; ends=[]
for s in sil: st=float(s[1]); d=float(s[3]); ends.append(st); starts.append(st+d)
ends.append(float(sys.argv[2]))
assert len(starts)==len(segs_txt), (len(starts),len(segs_txt))
words=[]
for (a,b),txt in zip(zip(starts,ends),segs_txt):
    a+=0.05; b-=0.05
    ws=txt.split(); wt=[len(re.sub(r'[^A-Za-z]','',w))+2+(3 if re.search(r'[,.?]$',w) else 0) for w in ws]
    tot=sum(wt); t=a
    for w,x in zip(ws,wt):
        d=(b-a)*x/tot; words.append({"text":w,"type":"word","start":round(t,3),"end":round(t+d*0.88,3)}); t+=d
json.dump({"words":words},open(sys.argv[3],'w'))
for w in words:
    if re.sub(r'\W','',w['text']).lower() in ('drink','microsleeps','gone','eyes','drunk','amygdala','sixty','huge','undoes','tonight','job'): print(w['text'],w['start'])
