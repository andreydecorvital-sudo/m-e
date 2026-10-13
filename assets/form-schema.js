
  
    export const stages=[
      {title:'Onde você vê os preços?',short:'Consulta',description:'Como você consulta os preços',hint:'Conte como você abre a PMG no dia a dia.',icon:'screen',questions:[
        {id:'device',type:'radio',label:'Em qual aparelho você usa a PMG?',options:['Celular Android','iPhone','Computador','Celular e computador','Não sei']},
        {id:'access',type:'radio',label:'Como você abre os preços?',options:['Em um site no navegador','Em um aplicativo no celular','Em um programa no computador','Recebo os valores de outra pessoa','Não sei']},
        {id:'system',type:'text',label:'Qual é o nome do aplicativo, programa ou site?',hint:'Se for um site, pode colar o link. Se não souber, tudo bem.',placeholder:'Ex.: o nome que aparece no ícone ou na tela',max:500},
        {id:'export',type:'multi',label:'Como consegue tirar a tabela do sistema?',hint:'Pode marcar mais de uma opção. Se não souber onde fica, marque “não sei”.',options:['Salvar em Excel ou planilha','Salvar em PDF','Copiar o texto','Tirar um print','Só consigo ver na tela','Não sei']}
      ]},
      {title:'O que muda nos preços?',short:'Preços',description:'Como encontrar o valor certo',hint:'Precisamos entender qual tabela vale para cada cliente.',icon:'tag',questions:[
        {id:'selectClient',type:'radio',label:'Para consultar o preço, precisa escolher um cliente antes?',options:['Sim','Não','Não sei']},
        {id:'differentPrices',type:'radio',label:'O mesmo produto pode ter preços diferentes para clientes diferentes?',options:['Sim','Não','Não sei']},
        {id:'changes',type:'multi',label:'O que pode fazer o preço mudar?',hint:'Marque as opções que conhece.',options:['O dia ou a semana','O cliente','A quantidade ou a caixa','O prazo ou a forma de pagamento','Promoções','A marca ou o peso','Não sei']},
        {id:'priceNote',type:'textarea',label:'Tem algum detalhe do preço que precisamos conferir?',hint:'Por exemplo: preço por kg, total da peça, validade da oferta ou peso que varia.',placeholder:'Pode escrever um exemplo ou deixar em branco.',max:1000}
      ]},
      {title:'Como você envia as ofertas?',short:'Envio',description:'Produtos, clientes e horário',hint:'Já temos um exemplo da sua tabela de muçarelas.',icon:'send',questions:[
        {id:'schedule',type:'radio',label:'Muçarelas toda segunda às 7h30: está certo?',known:'Você comentou esse horário na conversa com o Andrey.',options:['Isso mesmo','Quero mudar ou explicar o horário','Não sei ainda'],followup:{when:'Quero mudar ou explicar o horário',id:'scheduleDetail',label:'Qual dia e horário funciona melhor?',placeholder:'Ex.: segunda às 7h30; outros produtos na quarta.',max:600}},
        {id:'products',type:'text',label:'Além das muçarelas, quais produtos quer divulgar?',hint:'Se quiser começar só com muçarela, pode deixar em branco.',placeholder:'Ex.: presunto, calabresa, bebidas…',max:700},
        {id:'whatsappType',type:'radio',label:'Qual WhatsApp você usa para trabalhar?',options:['WhatsApp Business (ícone com B)','WhatsApp comum','Não sei']},
        {id:'channels',type:'multi',label:'Onde manda as ofertas?',hint:'Pode marcar mais de uma opção.',options:['Conversas individuais no WhatsApp','Listas de transmissão','Grupos de WhatsApp','Status do WhatsApp','Outro lugar','Não sei'],followup:{when:'Outro lugar',id:'channelsDetail',label:'Onde mais você envia?',placeholder:'Conte o outro lugar.',max:500}},
        {id:'clients',type:'radio',label:'Mais ou menos quantos clientes recebem?',options:['Até 20','De 21 a 50','De 51 a 100','Mais de 100','Não sei']},
        {id:'sameTable',type:'radio',label:'Manda a mesma tabela para todo mundo?',options:['Sim, a mesma para todos','Não, depende de cada cliente','Depende do produto ou do dia','Não sei']}
      ]},
      {title:'O que vamos facilitar primeiro?',short:'Sua ajuda',description:'A ajuda que faz diferença para você',hint:'Escolha o que tiraria mais trabalho da sua rotina.',icon:'spark',questions:[
        {id:'pain',type:'multi',label:'Quais partes dão mais trabalho?',hint:'Marque tudo o que quiser melhorar.',options:['Consultar os preços','Montar a tabela ou a arte','Conferir os valores e os pesos','Enviar para cada cliente','Lembrar de enviar no horário','Não sei fazer as artes','Outra coisa'],followup:{when:'Outra coisa',id:'painDetail',label:'O que mais dá trabalho?',placeholder:'Conte com suas palavras.',max:800}},
        {id:'material',type:'radio',label:'Que tipo de material seria mais útil?',options:['Uma tabela com vários produtos','Uma arte separada para cada produto','As duas opções','Não sei, quero ver um exemplo']},
        {id:'preference',type:'radio',label:'Como gostaria de usar essa ajuda?',options:['Receber pronto, conferir e enviar','Apertar um botão para preparar tudo','Deixar automático, se for possível','Primeiro quero ver um exemplo','Não sei ainda']},
        {id:'priority',type:'textarea',label:'Se eu pudesse resolver uma coisa primeiro, qual seria?',placeholder:'Ex.: ter as artes prontas com os preços certos.',max:1000},
        {id:'notes',type:'textarea',label:'Quer contar mais alguma coisa?',hint:'Pode deixar em branco.',placeholder:'Um detalhe, uma dificuldade ou uma ideia sua…',max:1200}
      ]}
    ];
    const unknowns=new Set(['Não sei','Não sei ainda']);
    export function normalize(raw, profile = 'mae'){const answers={};const src=raw&&typeof raw==='object'?raw:{};for(const stage of stagesFor(profile)){for(const q of stage.questions){if(q.type==='multi'){const input=Array.isArray(src[q.id])?src[q.id]:[];let values=q.options.filter(v=>input.includes(v));if(values.some(v=>unknowns.has(v)))values=values.filter(v=>unknowns.has(v));answers[q.id]=values;}else if(q.type==='radio'){answers[q.id]=q.options.includes(src[q.id])?src[q.id]:'';}else{answers[q.id]=typeof src[q.id]==='string'?src[q.id].slice(0,q.max||1000):'';}if(q.followup){const show=Array.isArray(answers[q.id])?answers[q.id].includes(q.followup.when):answers[q.id]===q.followup.when;answers[q.followup.id]=show&&typeof src[q.followup.id]==='string'?src[q.followup.id].slice(0,q.followup.max||600):'';}}}return answers;}
    function hasAnswer(value){return Array.isArray(value)?value.length>0:typeof value==='string'&&value.trim().length>0;}
    export function summary(raw,date, profile = 'mae'){const answers=normalize(raw, profile);const lines=['RESPOSTAS — OFERTAS DA PMG', 'Respondente: ' + (profile === 'tia' ? 'Tia' : 'Mãe'), 'Para o Andrey'];if(date)lines.push('Preenchido em: '+date);for(let i=0;i<stages.length;i++){const stage=stagesFor(profile)[i];lines.push('',''+(i+1)+'. '+stage.title.toUpperCase());for(const q of stage.questions){const value=answers[q.id];let result=Array.isArray(value)?value.join('; '):value.trim();if(!result)result='Não respondido';lines.push(q.label, '→ '+result);if(q.followup&&hasAnswer(answers[q.followup.id]))lines.push(q.followup.label,'→ '+answers[q.followup.id].trim());}}lines.push('','PRÓXIMO PASSO','Se puder, enviar ao Andrey um print da tela usada para consultar os preços. Já temos um exemplo da tabela de muçarelas.','Nenhuma oferta foi enviada aos clientes por este formulário.');return lines.join('\n');}
    export function count(raw, profile = 'mae'){const answers=normalize(raw, profile);let answered=0,total=0;for(const stage of stagesFor(profile))for(const q of stage.questions){total++;if(hasAnswer(answers[q.id]))answered++;}return{answered,total};}
    
  
export const profiles = {mae: {label: 'Mãe', greeting: 'Oi, mãe!'}, tia: {label: 'Tia', greeting: 'Oi, tia!'}};
export function stagesFor(profile = 'mae') {
 return stages.map(stage => ({...stage, questions: stage.questions.map(q => {
  if (profile === 'tia' && q.id === 'schedule') return {id: 'schedule', type: 'text', label: 'Em quais dias e horários você envia as ofertas?', hint: 'Pode contar como é a sua rotina.', placeholder: 'Ex.: segunda de manhã, ou quando o preço muda.', max: 600};
  return q;
 })}));
}
export function questionsFor(profile = 'mae') {
 return stagesFor(profile).flatMap((stage, section) => stage.questions.map(question => ({...question, section, sectionTitle: stage.title, sectionShort: stage.short})));
}
