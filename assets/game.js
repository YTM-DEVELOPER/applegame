(() => {
      const ROWS = 10, COLUMNS = 10;
      class AppleGame {
        constructor({board,score,time,cleared,progress,message,turn,round,onState,onFinish}) {
          Object.assign(this,{board,score,time,cleared,progress,message,turn,round,onState,onFinish});
          this.values=[];this.timerId=null;this.seconds=0;this.duration=0;this.points=0;this.applesCleared=0;this.active=false;this.dragStart=null;this.pointerId=null;this.bindBoardEvents();
        }
        makeBoard() {
          this.values=Array.from({length:ROWS*COLUMNS},(_,i)=>i<40?(i%2===0?1:9):1+Math.floor(Math.random()*9));
          for(let i=this.values.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[this.values[i],this.values[j]]=[this.values[j],this.values[i]];}
          this.board.replaceChildren(...this.values.map((value,index)=>{const cell=document.createElement('div');cell.className='apple';cell.dataset.index=String(index);cell.setAttribute('role','gridcell');cell.setAttribute('aria-label',`숫자 ${value} 사과`);cell.textContent=String(value);return cell;}));
        }
        start({duration,playerName,roundName}) {
          this.stop();this.duration=duration;this.seconds=duration;this.points=0;this.applesCleared=0;this.active=true;this.dragStart=null;this.turn.textContent=playerName;this.round.textContent=roundName;this.message.textContent='마우스나 손가락으로 사과를 드래그해 보세요.';this.makeBoard();this.renderState();
          this.timerId=setInterval(()=>{this.seconds=Math.max(0,this.seconds-1);this.renderState();if(this.seconds===0)this.finish();},1000);
        }
        stop(){clearInterval(this.timerId);this.timerId=null;this.active=false;this.dragStart=null;this.pointerId=null;this.clearSelection();}
        finish(){if(!this.active)return;this.active=false;clearInterval(this.timerId);this.timerId=null;this.clearSelection();this.onFinish({score:this.points,cleared:this.applesCleared});}
        renderState(){const m=String(Math.floor(this.seconds/60)).padStart(2,'0'),s=String(this.seconds%60).padStart(2,'0');this.score.textContent=this.points.toLocaleString('ko-KR');this.time.textContent=`${m}:${s}`;this.time.classList.toggle('is-low',this.seconds<=15);this.cleared.textContent=this.applesCleared.toLocaleString('ko-KR');this.progress.style.width=`${this.seconds/this.duration*100}%`;this.onState();}
        cellAt(x,y){const el=document.elementFromPoint(x,y),cell=el?.closest('.apple');return cell&&this.board.contains(cell)?Number(cell.dataset.index):null;}
        clearSelection(){this.board.querySelectorAll('.is-selected').forEach(cell=>cell.classList.remove('is-selected'));}
        selectTo(end){this.clearSelection();if(this.dragStart===null||end===null)return null;const r1=Math.floor(this.dragStart/COLUMNS),c1=this.dragStart%COLUMNS,r2=Math.floor(end/COLUMNS),c2=end%COLUMNS,top=Math.min(r1,r2),bottom=Math.max(r1,r2),left=Math.min(c1,c2),right=Math.max(c1,c2);let sum=0,count=0;for(let r=top;r<=bottom;r++)for(let c=left;c<=right;c++){const i=r*COLUMNS+c;if(!this.values[i])continue;sum+=this.values[i];count++;this.board.children[i].classList.add('is-selected');}return{sum,count,top,bottom,left,right};}
        bindBoardEvents(){
          this.board.addEventListener('pointerdown',e=>{if(!this.active)return;const i=this.cellAt(e.clientX,e.clientY);if(i===null||!this.values[i])return;e.preventDefault();this.dragStart=i;this.pointerId=e.pointerId;this.board.setPointerCapture(e.pointerId);this.selectTo(i);});
          this.board.addEventListener('pointermove',e=>{if(this.dragStart===null||e.pointerId!==this.pointerId)return;const i=this.cellAt(e.clientX,e.clientY);if(i!==null)this.selectTo(i);});
          this.board.addEventListener('pointerup',e=>{if(this.dragStart===null||e.pointerId!==this.pointerId)return;const selection=this.selectTo(this.cellAt(e.clientX,e.clientY)??this.dragStart);if(selection?.count&&selection.sum===10)this.removeSelection(selection);else if(selection?.count)this.message.textContent=`합이 ${selection.sum}이에요. 숫자 10에 맞춰 보세요.`;this.clearSelection();this.dragStart=null;this.pointerId=null;});
          this.board.addEventListener('pointercancel',()=>{this.clearSelection();this.dragStart=null;this.pointerId=null;});
        }
        removeSelection({top,bottom,left,right,count}){for(let r=top;r<=bottom;r++)for(let c=left;c<=right;c++){const i=r*COLUMNS+c;if(!this.values[i])continue;this.values[i]=0;this.board.children[i].classList.add('is-empty');this.board.children[i].setAttribute('aria-label','없어진 사과');}this.points+=count*10;this.applesCleared+=count;this.message.innerHTML=`좋아요! 사과 <strong>${count}개</strong>를 없앴어요.`;this.renderState();}
      }

      class MultiplayerConnection {
        constructor(callbacks){Object.assign(this,callbacks);this.peer=null;this.connection=null;this.loading=null;this.intentionalClose=false;}
        async loadPeer(){
          if(window.Peer)return window.Peer;
          if(!this.loading)this.loading=(async()=>{
            const sources=['https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js','https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js'];
            for(const src of sources){try{await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=src;script.onload=resolve;script.onerror=()=>{script.remove();reject(new Error('CDN load failed'));};document.head.append(script);});if(window.Peer)return window.Peer;}catch{}}
            throw new Error('PeerJS 스크립트를 불러오지 못했습니다. 인터넷 연결, 광고 차단 확장 프로그램 또는 CDN 접근을 확인해 주세요.');
          })().catch(error=>{this.loading=null;throw error;});
          return this.loading;
        }
        waitFor(eventTarget,eventName,timeoutMs,message){return new Promise((resolve,reject)=>{let settled=false;const timer=setTimeout(()=>{if(settled)return;settled=true;reject(new Error(message));},timeoutMs);eventTarget.once(eventName,value=>{if(settled)return;settled=true;clearTimeout(timer);resolve(value);});eventTarget.once('error',error=>{if(settled)return;settled=true;clearTimeout(timer);reject(this.describeError(error));});});}
        async createRoom(){
          this.close();this.intentionalClose=false;const Peer=await this.loadPeer(),id=`apple-${Math.random().toString(36).slice(2,8)}`;this.peer=new Peer(id,{debug:1});
          this.peer.on('error',error=>this.onStatus(this.describeError(error).message,'error'));
          this.peer.on('connection',conn=>{if(this.connection){conn.on('open',()=>{conn.send({type:'room-full'});conn.close();});return;}this.attach(conn,'host');});
          const room=await this.waitFor(this.peer,'open',12000,'PeerJS 서버 응답이 없습니다. 방화벽에서 443 포트와 0.peerjs.com 접속을 허용해 주세요.');
          this.onStatus('방 코드가 준비됐어요. 친구에게 코드를 보내 주세요.','success');return room;
        }
        async joinRoom(id){
          this.close();this.intentionalClose=false;const Peer=await this.loadPeer();this.peer=new Peer(undefined,{debug:1});
          this.peer.on('error',error=>this.onStatus(this.describeError(error).message,'error'));
          await this.waitFor(this.peer,'open',12000,'PeerJS 서버 응답이 없습니다. 방화벽에서 443 포트와 0.peerjs.com 접속을 허용해 주세요.');
          const conn=this.peer.connect(id,{reliable:true});this.attach(conn,'guest');
          await new Promise((resolve,reject)=>{let done=false;const finish=(fn,value)=>{if(done)return;done=true;clearTimeout(timer);fn(value);};const timer=setTimeout(()=>{conn.close();finish(reject,new Error('상대 방에 연결되지 않았습니다. 방 코드가 맞는지, 방 만든 기기가 아직 접속 중인지 확인해 주세요. 네트워크가 연결을 차단한다면 다른 Wi-Fi/모바일 핫스팟으로 시도해 보세요.'));},15000);conn.once('open',()=>finish(resolve));conn.once('error',error=>finish(reject,this.describeError(error)));conn.once('close',()=>finish(reject,new Error('상대가 연결을 종료했거나 방이 닫혔습니다.')));});
        }
        attach(conn,role){this.connection=conn;conn.on('open',()=>{this.onStatus('상대 기기와 연결됐습니다.','success');this.onConnected(role);if(role==='guest')this.send({type:'hello'});});conn.on('data',data=>this.onMessage(data));conn.on('close',()=>{this.connection=null;if(!this.intentionalClose){this.onStatus('상대와 연결이 끊겼습니다.');this.onDisconnected();}});conn.on('error',error=>this.onStatus(this.describeError(error).message,'error'));}
        send(data){if(this.connection?.open)this.connection.send(data);}
        close(){this.intentionalClose=true;this.connection?.close();this.connection=null;this.peer?.destroy();this.peer=null;}
        describeError(error){const type=error?.type||'unknown',message=error?.message||'';const guidance={
          'peer-unavailable':'방을 찾지 못했습니다. 코드를 다시 복사하고, 방 만든 기기가 접속 중인지 확인해 주세요.',
          'network':'PeerJS 신호 서버에 접속하지 못했습니다. 인터넷/방화벽에서 0.peerjs.com의 443 포트 접속을 확인해 주세요.',
          'server-error':'PeerJS 서버 오류입니다. 잠시 후 다시 시도해 주세요.',
          'socket-error':'실시간 연결이 차단됐습니다. VPN·광고 차단 기능을 잠시 끄거나 다른 네트워크로 시도해 보세요.',
          'socket-closed':'PeerJS 연결이 닫혔습니다. 인터넷 연결을 확인하고 다시 시도해 주세요.',
          'webrtc':'두 기기 사이 직접 연결이 막혔습니다. 같은 Wi-Fi 또는 모바일 핫스팟에서 시도해 보세요. 일부 회사/학교망은 TURN 서버 설정이 필요합니다.',
          'browser-incompatible':'이 브라우저에서 WebRTC를 지원하지 않습니다. 최신 Chrome, Edge 또는 Safari를 사용해 주세요.',
          'ssl-unavailable':'보안 연결에 실패했습니다. 페이지를 HTTPS 주소로 열어 주세요.',
          'unavailable-id':'방 코드가 이미 사용 중입니다. 새 방을 만들어 주세요.',
          'invalid-id':'방 코드 형식이 올바르지 않습니다. 방 코드를 다시 확인해 주세요.',
          'invalid-key':'PeerJS 서버 설정 오류입니다. 페이지 운영자에게 알려 주세요.'
        };
          const hint=guidance[type]||'인터넷 연결과 방 코드를 확인하고 다시 시도해 주세요.';
          return new Error(`${hint} [${type}]${message?` ${message}`:''}`);
        }
      }

      const $=id=>document.getElementById(id),ui={tabs:{solo:$('solo-mode'),local:$('duel-mode'),online:$('online-mode')},panel:$('online-panel'),scoreboard:$('duel-scores'),players:[$('player-one'),$('player-two')],scoreLabel:$('score-label'),shade:$('shade'),icon:$('result-emoji'),kicker:$('result-kicker'),title:$('result-title'),text:$('result-text'),button:$('play-again'),status:$('online-status'),code:$('room-code'),copy:$('copy-code'),leave:$('leave-room')};
      const state={mode:'solo',player:0,localScores:[0,0],onlineScores:[0,0],role:'',phase:'idle',resultAction:null};
      function status(text,tone=''){ui.status.textContent=text;ui.status.classList.toggle('is-error',tone==='error');ui.status.classList.toggle('is-success',tone==='success');}
      function updateScores(){const scores=state.mode==='online'?state.onlineScores:state.localScores;ui.players.forEach((card,i)=>{card.querySelector('strong').textContent=`${scores[i].toLocaleString('ko-KR')}점`;card.classList.toggle('is-turn',state.player===i&&(game.active||state.phase==='playing'));});ui.scoreLabel.textContent=state.mode==='solo'?'점수':`플레이어 ${state.player+1} 점수`;}
      function showResult({icon,kicker,title,text,button,action,disabled=false}){ui.icon.textContent=icon;ui.kicker.textContent=kicker;ui.title.textContent=title;ui.text.textContent=text;ui.button.textContent=button;ui.button.disabled=disabled;ui.button.hidden=!button;state.resultAction=action;ui.shade.hidden=false;}
      function hideResult(){ui.shade.hidden=true;state.resultAction=null;}
      function startRound(player,duration,label){state.player=player;hideResult();updateScores();game.start({duration,playerName:label,roundName:`ROUND 0${player+1}`});}
      function finalMatch(scores,online=false){if(online)state.phase='complete';const tied=scores[0]===scores[1],winner=scores[0]>scores[1]?1:2,guestWon=state.role==='guest'&&winner===2;const title=tied?'멋진 무승부!':online&&state.role==='guest'?(guestWon?'승리!':'패배!'):`플레이어 ${winner} 승리!`;showResult({icon:tied?'🤝':online&&state.role==='guest'&&!guestWon?'😢':'🏆',kicker:'MATCH COMPLETE',title,text:`플레이어 1 ${scores[0].toLocaleString('ko-KR')}점 · 플레이어 2 ${scores[1].toLocaleString('ko-KR')}점`,button:online?'새 대전 준비':'다시 대전하기',action:online?()=>{status('새 대전을 시작하려면 방을 다시 만들거나 새로운 방 코드로 참가하세요.');ui.panel.scrollIntoView({behavior:'smooth',block:'nearest'});}:resetLocal});}
      function onFinish({score}){
        if(state.mode==='solo'){showResult({icon:'⏰',kicker:'TIME IS UP',title:'시간 종료!',text:`최종 점수 ${score.toLocaleString('ko-KR')}점 · 사과 ${game.applesCleared}개`,button:'한 판 더 하기',action:()=>startRound(0,120,'나의 기록 도전')});return;}
        if(state.mode==='local'){state.localScores[state.player]=score;updateScores();if(state.player===0)showResult({icon:'🙌',kicker:'PLAYER 1 COMPLETE',title:'플레이어 1 완료!',text:`플레이어 1 점수 ${score.toLocaleString('ko-KR')}점`,button:'플레이어 2 시작',action:()=>startRound(1,60,'플레이어 2 차례')});else finalMatch(state.localScores);return;}
        state.onlineScores[state.player]=score;updateScores();if(state.role==='host'){network.send({type:'player1-score',score});state.phase='waiting';showResult({icon:'📡',kicker:'WAITING FOR OPPONENT',title:'상대 차례예요',text:`내 점수 ${score.toLocaleString('ko-KR')}점 · 친구가 플레이 중입니다.`,button:'',disabled:true});status('상대가 60초 플레이를 마칠 때까지 기다려 주세요.');}else{network.send({type:'player2-score',score});state.phase='complete';finalMatch(state.onlineScores,true);}
      }
      const game=new AppleGame({board:$('board'),score:$('score'),time:$('time'),cleared:$('cleared'),progress:$('progress'),message:$('message'),turn:$('turn-label'),round:$('round-label'),onState:updateScores,onFinish});
      function resetLocal(){state.localScores=[0,0];state.player=0;startRound(0,60,'플레이어 1 차례');}
      const network=new MultiplayerConnection({onStatus:status,onConnected:role=>{state.role=role;state.phase=role==='host'?'playing':'waiting';ui.leave.hidden=false;ui.copy.hidden=role!=='host';ui.players[0].querySelector('span:nth-child(2)').textContent=role==='host'?'나 (플레이어 1)':'상대 (플레이어 1)';ui.players[1].querySelector('span:nth-child(2)').textContent=role==='host'?'상대 (플레이어 2)':'나 (플레이어 2)';if(role==='host'){state.onlineScores=[0,0];startRound(0,60,'내 차례 · 플레이어 1');}else{state.player=0;game.stop();game.turn.textContent='친구 플레이 대기';game.message.textContent='플레이어 1이 차례를 마치면 내 차례가 시작돼요.';showResult({icon:'⏳',kicker:'CONNECTED',title:'상대 차례를 기다려요',text:'친구의 60초 라운드가 끝나면 내 차례가 시작됩니다.',button:'',disabled:true});updateScores();}},onDisconnected:()=>{game.stop();state.phase='disconnected';showResult({icon:'📡',kicker:'CONNECTION LOST',title:'상대와 연결이 끊겼어요',text:'네트워크 상태를 확인한 뒤 새 방을 만들거나 방 코드로 다시 참가해 주세요.',button:'확인',action:()=>hideResult()});},onMessage:data=>{if(data?.type==='hello'&&state.role==='host')status('친구가 참가했습니다. 게임을 시작할게요!','success');else if(data?.type==='player1-score'&&state.role==='guest'){const score=Number(data.score);if(!Number.isFinite(score)||score<0)return;state.onlineScores[0]=Math.floor(score);state.phase='playing';updateScores();startRound(1,60,'내 차례 · 플레이어 2');status('플레이어 1 완료! 이제 내 차례예요.','success');}else if(data?.type==='player2-score'&&state.role==='host'){const score=Number(data.score);if(!Number.isFinite(score)||score<0)return;state.onlineScores[1]=Math.floor(score);updateScores();finalMatch(state.onlineScores,true);status('대전이 끝났습니다.','success');}else if(data?.type==='room-full'){status('이 방은 이미 다른 플레이어가 참가했습니다. 새 방 코드로 다시 시도해 주세요.','error');network.close();game.stop();state.role='';state.phase='idle';ui.leave.hidden=true;showResult({icon:'🚫',kicker:'ROOM FULL',title:'방이 가득 찼어요',text:'이미 다른 플레이어가 참가한 방입니다. 새 방 코드를 확인해 주세요.',button:'확인',action:()=>hideResult()});}}});
      function setMode(mode){network.close();game.stop();state.mode=mode;state.role='';state.phase='idle';state.onlineScores=[0,0];state.player=0;Object.entries(ui.tabs).forEach(([key,tab])=>{tab.classList.toggle('is-active',key===mode);tab.setAttribute('aria-pressed',String(key===mode));});ui.panel.hidden=mode!=='online';ui.scoreboard.hidden=mode==='solo';ui.copy.hidden=true;ui.leave.hidden=true;ui.code.readOnly=false;ui.code.value='';ui.players[0].querySelector('span:nth-child(2)').textContent='플레이어 1';ui.players[1].querySelector('span:nth-child(2)').textContent='플레이어 2';hideResult();if(mode==='solo')startRound(0,120,'나의 기록 도전');else if(mode==='local'){state.localScores=[0,0];startRound(0,60,'플레이어 1 차례');}else{game.turn.textContent='온라인 대전';game.round.textContent='ROOM MATCH';game.message.textContent='방을 만들거나 친구의 방 코드로 참가하세요.';showResult({icon:'🌐',kicker:'PLAY TOGETHER',title:'친구를 초대해요',text:'방을 만들면 코드가 생성됩니다. 친구가 참가하면 대전이 시작돼요.',button:'',disabled:true});status('상대와 같은 웹 주소를 열어 주세요.');}updateScores();}
      ui.tabs.solo.addEventListener('click',()=>setMode('solo'));ui.tabs.local.addEventListener('click',()=>setMode('local'));ui.tabs.online.addEventListener('click',()=>setMode('online'));ui.button.addEventListener('click',()=>state.resultAction?.());
      $('restart').addEventListener('click',()=>{if(state.mode==='solo')startRound(0,120,'나의 기록 도전');else if(state.mode==='local')resetLocal();else setMode('online');});
      $('create-room').addEventListener('click',async()=>{state.mode='online';state.role='host';state.phase='connecting';state.onlineScores=[0,0];game.stop();hideResult();$('create-room').disabled=true;try{const id=await network.createRoom();ui.code.value=id;ui.code.readOnly=true;ui.copy.hidden=false;ui.leave.hidden=false;game.turn.textContent='상대 기다리는 중';game.message.textContent='친구가 방 코드로 참가하면 첫 번째 플레이가 시작됩니다.';showResult({icon:'🍏',kicker:'ROOM READY',title:'친구를 기다리는 중',text:`방 코드: ${id}`,button:'',disabled:true});}catch(error){network.close();state.role='';state.phase='idle';showResult({icon:'⚠️',kicker:'ROOM ERROR',title:'방을 만들지 못했어요',text:error.message,button:'확인',action:()=>hideResult()});status(error.message,'error');}finally{$('create-room').disabled=false;}});
      $('join-room').addEventListener('click',async()=>{const id=ui.code.value.trim();if(!id){status('참가할 방 코드를 입력해 주세요.','error');return;}state.mode='online';state.role='guest';state.phase='connecting';state.onlineScores=[0,0];game.stop();hideResult();$('join-room').disabled=true;try{await network.joinRoom(id);ui.leave.hidden=false;}catch(error){network.close();state.role='';state.phase='idle';ui.leave.hidden=true;showResult({icon:'⚠️',kicker:'JOIN ERROR',title:'방에 참가하지 못했어요',text:error.message,button:'확인',action:()=>hideResult()});status(error.message,'error');}finally{$('join-room').disabled=false;}});
      ui.copy.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(ui.code.value);status('방 코드를 복사했습니다. 친구에게 공유해 주세요.','success');}catch{ui.code.select();status('코드를 선택했습니다. 복사해서 친구에게 보내 주세요.');}});
      ui.leave.addEventListener('click',()=>{network.close();game.stop();state.role='';state.phase='idle';ui.copy.hidden=true;ui.leave.hidden=true;ui.code.readOnly=false;hideResult();game.turn.textContent='온라인 대전';game.message.textContent='연결을 종료했습니다. 새 방을 만들거나 다른 방에 참가하세요.';status('연결을 종료했습니다.');});
      ui.code.addEventListener('keydown',e=>{if(e.key==='Enter')$('join-room').click();});
      startRound(0,120,'나의 기록 도전');
    })();
