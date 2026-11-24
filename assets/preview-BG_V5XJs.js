import{r as N,j as P}from"./index-DfqWmhja.js";const zt="_root_1g5sw_17",Kt="_fallback_1g5sw_57",Yt="_canvas_1g5sw_69",Vt="_canvasHidden_1g5sw_70",$t="_frame_1g5sw_84",Jt="_content_1g5sw_92",Qt="_item_1g5sw_103",Zt="_itemHidden_1g5sw_104",te="_title_1g5sw_121",ee="_titleLarge_1g5sw_133",oe="_titleMedium_1g5sw_137",ne="_titleSmall_1g5sw_141",re="_body_1g5sw_146",ae="_extra_1g5sw_156",se="_button_1g5sw_160",U={root:zt,fallback:Kt,canvas:Yt,canvasHidden:Vt,frame:$t,content:Jt,item:Qt,itemHidden:Zt,title:te,titleLarge:ee,titleMedium:oe,titleSmall:ne,body:re,extra:ae,button:se},bt=380,Ct=1e3/60,ie=2,ce=38e3,le=[150,192,236,284],dt=3,ue=.9955,fe=.07,me=.004,de=`
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`,he=`
precision highp float;
uniform sampler2D u_sim;
uniform vec2 u_res;
uniform float u_scale;
uniform vec2 u_grid;
uniform float u_cell;
uniform float u_intensity;
uniform float u_torn;
uniform vec3 u_kA;
uniform vec3 u_kB;
uniform vec3 u_paper;
uniform vec3 u_kC;
uniform sampler2D u_tint;
uniform float u_pointerTint;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 r = mat2(0.8, -0.6, 0.6, 0.8);
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p = r * p * 2.03 + 3.1;
    a *= 0.5;
  }
  return v;
}
float tooth(vec2 p) {
  return 0.5 * fbm(p / 6.5) + 0.32 * noise(p / 2.4 + 7.0) + 0.18 * noise(p / 1.15 + 19.0);
}
float dec(float v) { return v * v * 1.6; }
float pig(vec2 uv) {
  vec4 t = texture2D(u_sim, uv);
  return dec(t.r) + dec(t.g);
}

void main() {
  vec2 px = gl_FragCoord.xy / u_scale;
  vec2 size = u_res / u_scale;
  vec2 pp = vec2(px.x, size.y - px.y);

  float h = tooth(pp);
  float valley = clamp((0.5 - h) * 2.2, -1.0, 1.0);

  vec2 q = vec2(fbm(pp / 54.0), fbm(pp / 54.0 + 31.0)) - 0.5;
  vec2 fine = vec2(noise(pp / 9.0), noise(pp / 9.0 + 11.0)) - 0.5;
  vec2 warp = q * 2.0 * u_cell * mix(1.5, 2.2, u_torn) + fine * u_cell * (0.3 + 0.5 * u_torn);
  vec2 uv = (pp + warp) / size;
  vec2 uv2 = uv + vec2(0.011, -0.008) + q * 0.05;
  vec4 s = texture2D(u_sim, uv);
  vec4 s2 = texture2D(u_sim, uv2);

  float a = 0.64 * dec(s.r) + 0.42 * dec(s2.r);
  float b = 0.64 * dec(s.g) + 0.42 * dec(s2.g);
  float wet = s.b;
  float dep = s.a;

  float edge = mix(1.0, smoothstep(0.012, 0.11, a + b), u_torn);
  a *= edge;
  b *= edge;

  float drift = fbm(pp / 130.0 + 5.0);
  float depth = 0.78 + 0.44 * fbm(pp / 95.0 + 9.0);
  vec3 kA = mix(u_kA, u_kC, 0.32 * drift);
  vec3 kB = mix(u_kB, u_kC, 0.32 * (1.0 - drift));

  float gran = 0.3 + 0.7 * dep;
  float gA = clamp(1.0 - valley * 0.6 * gran, 0.45, 1.6);
  float gB = clamp(1.0 - valley * 0.3 * gran, 0.6, 1.4);
  float lustre = 1.0 + 0.1 * smoothstep(0.1, 0.9, wet);

  vec3 absorb = (a * gA * kA + b * gB * kB) * depth * u_intensity * lustre;

  vec2 e1 = vec2(1.8 / u_grid.x, 0.0);
  vec2 e2 = vec2(0.0, 1.8 / u_grid.y);
  float gx = pig(uv + e1) - pig(uv - e1);
  float gy = pig(uv + e2) - pig(uv - e2);
  float rim = smoothstep(0.02, 0.3, length(vec2(gx, gy)));
  absorb *= 1.0 + 0.32 * rim * smoothstep(0.02, 0.2, a + b);

  float tint = texture2D(u_tint, pp / size).r;
  absorb += tint * u_pointerTint * u_kC * (0.7 + 0.3 * drift) * (1.0 - 0.25 * valley * gran);

  absorb /= 1.0 + 0.3 * dot(absorb, vec3(0.333));
  vec3 col = u_paper * exp(-absorb);

  float relief = (h - tooth(pp + vec2(1.4, 0.0))) * 0.9 + (h - tooth(pp + vec2(0.0, 1.4))) * 0.6;
  col *= 1.0 + relief * 0.11 + 0.014 * (h - 0.5);
  col *= 1.015 - 0.04 * (pp.y / size.y);
  col *= 1.0 - 0.04 * smoothstep(0.03, 0.5, wet);
  col += (hash(pp) - 0.5) * 0.006;
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`,pe=(o,r,i)=>{o.fillStyle="#000",o.fillStyle=r||"#000",o.fillRect(0,0,1,1);const[c,s,S,p]=o.getImageData(0,0,1,1).data;return p===0||!r?i:[c/255,s/255,S/255]},qt=o=>[-Math.log(Math.max(o[0],.03)),-Math.log(Math.max(o[1],.03)),-Math.log(Math.max(o[2],.03))],Wt=(o,r,i)=>{const c=o.createShader(r);return c?(o.shaderSource(c,i),o.compileShader(c),o.getShaderParameter(c,o.COMPILE_STATUS)?c:null):null},st=(o,r,i)=>o+(r-o)*i,wt=(o,r,i)=>{const c=Math.min(Math.max((i-o)/(r-o),0),1);return c*c*(3-2*c)},Tt=(o,r)=>{let i=Math.imul(o,374761393)+Math.imul(r,668265263);return i=Math.imul(i^i>>>13,1274126177),((i^i>>>16)>>>0)/4294967295},It=(o,r)=>{const i=Math.floor(o),c=Math.floor(r),s=wt(0,1,o-i),S=wt(0,1,r-c);return st(st(Tt(i,c),Tt(i+1,c),s),st(Tt(i,c+1),Tt(i+1,c+1),s),S)},_e=o=>()=>{o=o+1831565813|0;let r=Math.imul(o^o>>>15,1|o);return r=r+Math.imul(r^r>>>7,61|r)^r,((r^r>>>14)>>>0)/4294967295},ve=[{from:0,to:34,path:[[-.05,.1],[1.05,.2]],radius:.2,water:.95,a:0,b:0},{from:20,to:56,path:[[1.05,.44],[-.05,.52]],radius:.2,water:.95,a:0,b:0},{from:42,to:82,path:[[-.05,.8],[1.05,.88]],radius:.2,water:.95,a:0,b:0},{from:40,to:100,path:[[1.1,0],[.8,.08],[.54,.04],[.3,.1]],radius:.14,water:0,a:.085,b:0},{from:60,to:118,path:[[1.06,.2],[.86,.44],[.96,.78]],radius:.16,water:0,a:.09,b:0},{from:72,to:96,path:[[0,-.02],[.2,.04]],radius:.09,water:0,a:.08,b:0},{from:62,to:124,path:[[1.06,1.06],[.76,.86],[.56,.7],[.64,.44]],radius:.15,water:0,a:0,b:.085},{from:80,to:106,path:[[-.05,.38],[.1,.16]],radius:.1,water:0,a:0,b:.075},{from:96,to:130,path:[[.95,1.06],[.5,1.04]],radius:.1,water:0,a:0,b:.07}],xe=(o,r)=>{const i=r*(o.length-1),c=Math.min(Math.floor(i),o.length-2),s=i-c;return[st(o[c][0],o[c+1][0],s),st(o[c][1],o[c+1][1],s)]};function ge(o,r,i,c){const s=o*r,S=Math.sqrt(o*r),p=new Float32Array(s),b=new Float32Array(s),E=new Float32Array(s),W=new Float32Array(s),X=new Float32Array(s),Y=new Float32Array(s),j=new Float32Array(s),A=new Float32Array(s),F=new Float32Array(s),C=new Float32Array(s),I=_e(11),$=c?.34:.5,it=c?.02:.06;for(let e=0;e<r;e++)for(let n=0;n<o;n++){const a=e*o+n;C[a]=.4+1.1*It(n*.23,e*.23)*(.6+.8*It(n*.7+40,e*.7)),F[a]=1-.94*i[a]}const ot=()=>{Y.fill(0),j.fill(0),A.fill(0);for(let e=0;e<r;e++)for(let n=0;n<o;n++){const a=e*o+n;for(let f=0;f<2;f++){if(f===0?n+1>=o:e+1>=r)continue;const t=f===0?a+1:a+o,g=p[a],u=p[t];if(g===0&&u===0)continue;const v=g-u,G=Math.abs(v),Z=Math.min(g,u),tt=(F[a]+F[t])*.5,x=(g+u)*.5;if(Z>.02&&G<2e-4)continue;const l=v>0?a:t,O=v>0?t:a;let k=$*((C[a]+C[t])*.5)*tt*(x+.03)*G;if(k=Math.min(k,.2*G),k>0&&(Y[l]-=k,Y[O]+=k,p[l]>.05)){const M=Math.min(k/Math.max(p[l],.04),.2),R=b[l]*M,H=E[l]*M;j[l]-=R,j[O]+=R,A[l]-=H,A[O]+=H}const D=it*Z*tt;if(D>0){const M=(b[a]-b[t])*D,R=(E[a]-E[t])*D;j[a]-=M,j[t]+=M,A[a]-=R,A[t]+=R}}}for(let e=0;e<s;e++)p[e]=Math.max(p[e]+Y[e],0),b[e]=Math.max(b[e]+j[e],0),E[e]=Math.max(E[e]+A[e],0)},Et=()=>{for(let e=0;e<s;e++){const n=p[e];if(n===0&&b[e]===0&&E[e]===0)continue;const a=Math.max(n-.0017*(.75+.5*(1-Math.min(n,1)))*(.8+.4*C[e]),0);p[e]=a;const f=a<.03?1:.004+.09*(1-wt(.03,.4,a)),t=b[e]*f,g=E[e]*f;if(b[e]-=t,E[e]-=g,W[e]+=t,X[e]+=g,a>.2){const u=(a-.2)*.04,v=W[e]*u*.7,G=X[e]*u*.4;W[e]-=v,X[e]-=G,b[e]+=v,E[e]+=G}}},J=(e,n,a,f,t,g)=>{const u=a*S,v=Math.max(Math.floor(e-u),0),G=Math.min(Math.ceil(e+u),o-1),Z=Math.max(Math.floor(n-u),0),tt=Math.min(Math.ceil(n+u),r-1);for(let x=Z;x<=tt;x++)for(let l=v;l<=G;l++){const O=((l-e)*(l-e)+(x-n)*(x-n))/(u*u);if(O>=1)continue;const k=(1-O)*(1-O),D=x*o+l,M=F[D];f>0&&(p[D]=Math.max(p[D],f*Math.min(1,k*1.7)*(.3+.7*M))),b[D]+=t*k*M,E[D]+=g*k*M}},ht=()=>{let e=-1,n=o/2,a=r/2;for(let f=0;f<90;f++){const t=Math.floor(I()*o),g=Math.floor(I()*r),u=g*o+t,v=(b[u]+E[u]+W[u]+X[u])*F[u]*(.6+I()*.8);v>e&&(e=v,n=t,a=g)}return[n,a]},Mt=e=>{for(const n of ve){if(e<n.from||e>=n.to)continue;const a=(e-n.from)/(n.to-n.from),[f,t]=xe(n.path,a),g=1-.55*a,u=.9+.2*I();J(f*o,t*r,n.radius*u,n.water,n.a*g,n.b*g)}if(le.includes(e)){const[n,a]=ht();J(n,a,.05+.03*I(),1,0,0)}},Q=new Uint8Array(s*4),pt=e=>Math.min(Math.sqrt(e/1.6)*255,255);return{step(e){e<bt&&Mt(e);for(let n=0;n<ie;n++)ot();Et()},drop:J,wetTotal(){let e=0;for(let n=0;n<s;n++)e+=p[n];return e},pack(){for(let e=0;e<s;e++){const n=b[e]+W[e],a=E[e]+X[e],f=n+a,t=e*4;Q[t]=pt(n),Q[t+1]=pt(a),Q[t+2]=Math.min(p[e]*255,255),Q[t+3]=f>5e-4?(W[e]+X[e])/f*255:0}return Q}}}const Te=(o,r,i,c,s,S)=>{const p=new Float32Array(o*r);if(!s)return p;const b=i/o,E=c/r,W=s.left-S.left-8,X=s.right-S.left+8,Y=s.top-S.top-8,j=s.bottom-S.top+8;for(let A=0;A<r;A++)for(let F=0;F<o;F++){const C=(F+.5)*b,I=(A+.5)*E,$=Math.max(W-C,0,C-X),it=Math.max(Y-I,0,I-j),ot=Math.hypot($,it)-(It(F*.16,A*.16)-.5)*56;p[A*o+F]=1-wt(6,52,ot)}return p};function be({title:o="Slow suppers, painted by the season",body:r="Seven small courses built around what the market brings in each morning, served at one long table by the window.",buttonLabel:i="Reserve a table",buttonLink:c="#reserve",colorOne:s,colorTwo:S,washIntensity:p=62,edgeStyle:b="soft",pointerTint:E=50,ariaLabel:W,children:X,className:Y}){const j=N.useRef(null),A=N.useRef(null),F=N.useRef(null),C=N.useRef({washIntensity:p,edgeStyle:b,pointerTint:E});C.current={washIntensity:p,edgeStyle:b,pointerTint:E};const I=N.useRef(()=>{}),$=N.useRef(()=>{}),[it,ot]=N.useState(!1),[Et,J]=N.useState(!0),ht=`${N.useId()}-title`;N.useEffect(()=>{var Gt;const e=j.current,n=A.current,a=F.current;if(!e||!n||!a)return;const f=window.matchMedia("(prefers-reduced-motion: reduce)").matches,t=n.getContext("webgl",{antialias:!1,premultipliedAlpha:!1});if(!t)return;const g=Wt(t,t.VERTEX_SHADER,de),u=Wt(t,t.FRAGMENT_SHADER,he),v=t.createProgram();if(!g||!u||!v||(t.attachShader(v,g),t.attachShader(v,u),t.linkProgram(v),!t.getProgramParameter(v,t.LINK_STATUS)))return;t.useProgram(v);const G=t.createBuffer();t.bindBuffer(t.ARRAY_BUFFER,G),t.bufferData(t.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),t.STATIC_DRAW);const Z=t.getAttribLocation(v,"a_pos");t.enableVertexAttribArray(Z),t.vertexAttribPointer(Z,2,t.FLOAT,!1,0,0);const tt=t.createTexture();t.bindTexture(t.TEXTURE_2D,tt),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,t.CLAMP_TO_EDGE),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,t.CLAMP_TO_EDGE),t.pixelStorei(t.UNPACK_ALIGNMENT,1);const x=m=>t.getUniformLocation(v,m),l={sim:x("u_sim"),res:x("u_res"),scale:x("u_scale"),grid:x("u_grid"),cell:x("u_cell"),intensity:x("u_intensity"),torn:x("u_torn"),kA:x("u_kA"),kB:x("u_kB"),kC:x("u_kC"),paper:x("u_paper"),tint:x("u_tint"),pointerTint:x("u_pointerTint")};t.uniform1i(l.sim,0),t.uniform1i(l.tint,1);const O=t.createTexture();t.activeTexture(t.TEXTURE1),t.bindTexture(t.TEXTURE_2D,O),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MIN_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_MAG_FILTER,t.LINEAR),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_S,t.CLAMP_TO_EDGE),t.texParameteri(t.TEXTURE_2D,t.TEXTURE_WRAP_T,t.CLAMP_TO_EDGE),t.activeTexture(t.TEXTURE0);const k=document.createElement("canvas").getContext("2d",{willReadFrequently:!0}),D=()=>{const m=getComputedStyle(e),h=(_,T)=>k?pe(k,m.getPropertyValue(_).trim(),T):T,d=qt(h("--wash-color-one",[.18,.23,.55])),B=qt(h("--wash-color-two",[.35,.54,.18]));t.uniform3fv(l.kA,d),t.uniform3fv(l.kB,B),t.uniform3fv(l.kC,[0,1,2].map(_=>st(d[_],B[_],.5)*.9+(_===0?.03:0))),t.uniform3fv(l.paper,h("--wash-paper",[.965,.957,.933]))};let M=null,R=0,H=0,q=0,et=0,_t=0,ct=f,lt=!1,z=0,ut=0,L=0,V=0,y=new Float32Array(0),vt=new Float32Array(0),yt=new Uint8Array(0),xt=0,nt=null,K=null,At=0;const Ot=m=>{if(!L)return;const h=performance.now()-At>450;if(nt&&K){const _=1-Math.pow(1-fe,m);if(K[0]+=(nt[0]-K[0])*_,K[1]+=(nt[1]-K[1])*_,!h){const T=.13*Math.sqrt(R*H)/dt,w=K[0]/dt,rt=K[1]/dt,Lt=Math.max(Math.floor(w-T),0),Ut=Math.min(Math.ceil(w+T),L-1),Nt=Math.max(Math.floor(rt-T),0),at=Math.min(Math.ceil(rt+T),V-1);for(let ft=Nt;ft<=at;ft++)for(let mt=Lt;mt<=Ut;mt++){const Pt=((mt-w)*(mt-w)+(ft-rt)*(ft-rt))/(T*T);if(Pt>=1)continue;const Ht=ft*L+mt;y[Ht]=Math.min(y[Ht]+.014*m*(1-Pt)*(1-Pt),.5)}}}const d=Math.pow(ue,m);let B=0;for(let _=0;_<V;_++)for(let T=0;T<L;T++){const w=_*L+T,rt=T>0?y[w-1]:y[w],Lt=T+1<L?y[w+1]:y[w],Ut=_>0?y[w-L]:y[w],Nt=_+1<V?y[w+L]:y[w],at=(y[w]*.6+(rt+Lt+Ut+Nt)*.1)*d;vt[w]=at<4e-4?0:at,at>B&&(B=at)}[y,vt]=[vt,y],xt=B},Rt=()=>{if(!M)return;const{washIntensity:m,edgeStyle:h}=C.current;t.uniform1f(l.intensity,Math.min(Math.max(m,0),100)/66),t.uniform1f(l.torn,h==="torn"?1:0),t.uniform1f(l.pointerTint,Math.min(Math.max(C.current.pointerTint,0),100)/50);for(let d=0;d<y.length;d++)yt[d]=Math.min(y[d]*510,255);t.activeTexture(t.TEXTURE1),t.texImage2D(t.TEXTURE_2D,0,t.LUMINANCE,L,V,0,t.LUMINANCE,t.UNSIGNED_BYTE,yt),t.activeTexture(t.TEXTURE0),t.texImage2D(t.TEXTURE_2D,0,t.RGBA,R,H,0,t.RGBA,t.UNSIGNED_BYTE,M.pack()),t.drawArrays(t.TRIANGLES,0,3)},gt=()=>{const m=e.getBoundingClientRect(),{width:h,height:d}=m;if(h===0||d===0)return;const _=h<640?1.25:Math.min(window.devicePixelRatio||1,1.5);n.width=Math.round(h*_),n.height=Math.round(d*_),t.viewport(0,0,n.width,n.height);const T=Math.max(4,Math.sqrt(h*d/ce));R=Math.ceil(h/T),H=Math.ceil(d/T),t.uniform2f(l.res,n.width,n.height),t.uniform1f(l.scale,_),t.uniform2f(l.grid,R,H),t.uniform1f(l.cell,h/R),L=Math.ceil(R/dt),V=Math.ceil(H/dt),y=new Float32Array(L*V),vt=new Float32Array(L*V),yt=new Uint8Array(L*V),xt=0;const w=Te(R,H,h,d,a.getBoundingClientRect(),m);M=ge(R,H,w,C.current.edgeStyle==="torn"),et=f?bt:ct?Math.max(q,1):0,q=0,_t=0,Rt(),et>0&&St()},Dt=m=>{if(z=0,!M)return;const h=ut?Math.min(m-ut,64):0;ut=m;const d=q<et;d||(_t+=h);const B=performance.now()+(d?12:8);let _=0;for(;_<24&&performance.now()<B&&(d?q<et:_t>=Ct&&_<3);)q<bt+60&&M.step(q),q++,d||(_t-=Ct),_++;!f&&!d&&(nt||xt>0)&&Ot(Math.max(h/Ct,.5)),(!(f||d)||q>=et)&&(Rt(),ot(!0)),(q<bt||xt>me||!!nt&&performance.now()-At<900||q<et)&&lt?z=requestAnimationFrame(Dt):ut=0};function St(){!z&&ct&&lt&&M&&(z=requestAnimationFrame(Dt))}D(),gt(),J(!!f),I.current=()=>{D(),Rt()},$.current=()=>{gt()};let Ft=0;const kt=new ResizeObserver(()=>{window.clearTimeout(Ft),Ft=window.setTimeout(gt,90)});kt.observe(e),kt.observe(a),(Gt=document.fonts)==null||Gt.ready.then(()=>gt());const Bt=new IntersectionObserver(([m])=>{lt=m.isIntersecting,lt&&m.intersectionRatio>=.15&&!ct&&(ct=!0,J(!0)),lt?St():z&&(cancelAnimationFrame(z),z=0,ut=0)},{threshold:[0,.15]});Bt.observe(e);const Xt=m=>{if(f||m.pointerType==="touch"||!M||!ct||q<et||a.contains(m.target))return;const h=e.getBoundingClientRect(),d=(m.clientX-h.left)/h.width*R,B=(m.clientY-h.top)/h.height*H;nt=[d,B],K=K??[d,B],At=performance.now(),St()};e.addEventListener("pointermove",Xt);const jt=m=>{m.preventDefault(),cancelAnimationFrame(z),z=0,ot(!1)};return n.addEventListener("webglcontextlost",jt),()=>{cancelAnimationFrame(z),window.clearTimeout(Ft),kt.disconnect(),Bt.disconnect(),e.removeEventListener("pointermove",Xt),n.removeEventListener("webglcontextlost",jt),I.current=()=>{},$.current=()=>{},t.deleteTexture(tt),t.deleteTexture(O),t.deleteBuffer(G),t.deleteProgram(v),t.deleteShader(g),t.deleteShader(u)}},[]),N.useEffect(()=>{I.current()},[s,S,p]),N.useEffect(()=>{$.current()},[b]);const Mt={...s?{"--wash-color-one":s}:{},...S?{"--wash-color-two":S}:{}},Q=!o||o.length<=34?"titleLarge":o.length<=70?"titleMedium":"titleSmall",pt=[o?P.jsx("h2",{id:ht,className:`${U.title} ${U[Q]}`,children:o},"title"):null,r?P.jsx("p",{className:U.body,children:r},"body"):null,X?P.jsx("div",{className:U.extra,children:X},"children"):null,i?P.jsx("a",{className:U.button,href:c||void 0,children:i},"button"):null].filter(Boolean);return P.jsxs("section",{ref:j,className:[U.root,Y].filter(Boolean).join(" "),style:Mt,"aria-label":o?void 0:W,"aria-labelledby":o?ht:void 0,children:[P.jsx("div",{className:U.fallback,"aria-hidden":"true"}),P.jsx("canvas",{ref:A,className:it?U.canvas:U.canvasHidden,"aria-hidden":"true"}),P.jsx("div",{className:U.frame,children:P.jsx("div",{ref:F,className:U.content,children:pt.map((e,n)=>P.jsx("div",{className:Et?U.item:U.itemHidden,style:{"--stagger":n},children:e},n))})})]})}const we={title:"An extraordinarily long-winded headline about Mediterranean-inspired, locally-sourced, zero-waste neighbourhood dining experiences",body:"Every Thursday, Friday and Saturday evening we open the long table by the window for a slow, seven-course supper built entirely around whatever the farmers, foragers and fishermen bring to our kitchen door that morning. Menus change without notice, dietary requirements are welcomed with forty-eight hours of warning, and the last seating is at nine-thirty sharp, after which the candles are lit and nobody is rushed out.",buttonLabel:"Reserve your place at the long table for this coming weekend"},Ee={minHeight:"100vh",boxSizing:"border-box",display:"grid",placeItems:"center",padding:"clamp(16px, 4vw, 56px)",background:"linear-gradient(180deg, #eceae4 0%, #e3e1da 100%)"};function ye(){const o=N.useMemo(()=>new URLSearchParams(typeof window>"u"?"":window.location.search),[]),r=o.get("worst")==="1",i=o.get("edge")??(r?"torn":"soft");return P.jsx("div",{style:Ee,children:P.jsx("div",{style:{width:"100%",maxWidth:1200},children:P.jsx(be,{edgeStyle:i,...r?we:{}})})})}export{ye as default};
