(function(){"use strict";const f={linear:"x","linear-horizontal":"y",polar:"o",parametric:"t"};for(let o of Array.from(Object.getOwnPropertyNames(Math)))self[o.toLowerCase()]=self[o]=Math[o];self.osc=(o,c)=>Math.sin(2*Math.PI*o*c),onmessage=({data:{index:o,functions:c,type:n,values:r,dimensions:i=2}})=>{let s="",h=[0];try{const a=c.map(t=>new Function(f[n],"return "+t));for(let t=0;t<r.length;t+=i){const e=r[t];i===1?r[t]=a[0](e):n==="parametric"?(r[t]=a[0](e),r[t+1]=a[1](e)):(r[t]=e,r[t+1]=a[0](e),n==="polar"&&(r[t]=r[t+1]*Math.cos(e),r[t+1]*=Math.sin(e)))}}catch(a){s=a}postMessage({index:o,values:r,type:n,skips:h,err:s})}})();