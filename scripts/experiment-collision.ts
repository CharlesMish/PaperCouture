type V=[number,number,number];
const sub=(a:V,b:V):V=>a.map((x,i)=>x-b[i]) as V;
const dot=(a:V,b:V)=>a.reduce((s,x,i)=>s+x*b[i],0);
const cross=(a:V,b:V):V=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
// Strict interior edge/triangle piercing diagnostic. Coplanar contact and
// tangencies are excluded. It is deliberately NOT a thickness/CCD solver.
function pierces(a:V,b:V,t:V[]):boolean {
 const e1=sub(t[1],t[0]),e2=sub(t[2],t[0]),d=sub(b,a),h=cross(d,e2),det=dot(e1,h);
 if(Math.abs(det)<1e-10)return false;
 const inv=1/det,s=sub(a,t[0]),u=inv*dot(s,h),q=cross(s,e1),v=inv*dot(d,q),r=inv*dot(e2,q),eps=1e-6;
 return u>eps&&v>eps&&u+v<1-eps&&r>eps&&r<1-eps;
}
export function interiorPiercing(a:V[],b:V[]):boolean {
 for(let i=0;i<3;i++)if(pierces(a[i],a[(i+1)%3],b)||pierces(b[i],b[(i+1)%3],a))return true;
 return false;
}
