(function(){"use strict";const h={linear:"x","linear-horizontal":"y",polar:"o",parametric:"t"};for(let t of Array.from(Object.getOwnPropertyNames(Math)))self[t.toLowerCase()]=self[t]=Math[t];self.osc=(t,e)=>Math.sin(2*Math.PI*t*e),self.adsr=(t,e=.2,n=.1,r=.2,a=.2,c=.5)=>t<=e?t/e:t<=e+n?1-(1-c)*(t-e)/n:t<=e+n+r?c:t<=e+n+r+a?c-(c-0)*(t-e-n-r)/a:0,onmessage=({data:{index:t,functions:e,type:n,values:r,dimensions:a=2}})=>{let c="",s=[0];try{const f=e.map(o=>new Function(h[n],"return "+o));for(let o=0;o<r.length;o+=a){const i=r[o];a===1?r[o]=f[0](i):n==="parametric"?(r[o]=f[0](i),r[o+1]=f[1](i)):(r[o]=i,r[o+1]=f[0](i),n==="polar"&&(r[o]=r[o+1]*Math.cos(i),r[o+1]*=Math.sin(i)))}}catch(f){c=f}postMessage({index:t,values:r,type:n,skips:s,err:c})}})();