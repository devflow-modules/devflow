/**
 * Fonte única de artigos do blog — usado em /blog, /blog/[slug] e sitemap.
 */

export type BlogArticle = {
  slug: string;
  title: string;
  description: string;
  excerpt: string;
  date: string;
  content: string;
};

export const blogArticles: BlogArticle[] = [
  {
    slug: "automacao-whatsapp-empresas-guia-completo",
    title: "Automação de WhatsApp para empresas: guia completo",
    description:
      "Tudo o que você precisa saber para automatizar o atendimento da sua empresa no WhatsApp.",
    excerpt:
      "Tudo o que você precisa saber para automatizar o atendimento da sua empresa no WhatsApp.",
    date: "2025-03-11",
    content: `
      <p>Empresas que usam WhatsApp para atendimento sabem: o volume de mensagens cresce rápido. E quando cresce, responder manualmente vira um problema.</p>
      <p>Automação de WhatsApp, no sentido da DevFlow, responde o que foi permitido e passa a conversa para uma pessoa quando precisa de contexto. A equipe continua no mesmo inbox, com responsável e histórico.</p>
      <h2>O que a automação organiza</h2>
      <ul>
        <li><strong>Respostas do fluxo</strong> para perguntas frequentes (horário, produtos, preços, entrega), quando a automação está ativa</li>
        <li><strong>Handoff</strong> — a conversa pode ir para uma pessoa, com o histórico</li>
        <li><strong>Fila</strong> — dá para ver quem está com a conversa e o que ainda precisa de resposta</li>
      </ul>
      <h2>Quando vale a pena?</h2>
      <p>Se sua equipe repete as mesmas respostas dezenas de vezes por dia, automação faz sentido. Se você recebe poucas mensagens, talvez o WhatsApp comum já resolva.</p>
      <h2>Como começar</h2>
      <p>Comece mapeando as perguntas mais frequentes. Depois, defina fluxos de resposta. O ideal é usar uma plataforma com integração oficial Meta, como a DevFlow WhatsApp Platform.</p>
      <p><a href="/automacao-whatsapp">Conheça a automação DevFlow</a> e veja como funciona na prática.</p>
    `,
  },
  {
    slug: "como-automatizar-atendimento-whatsapp",
    title: "Como automatizar atendimento no WhatsApp",
    description:
      "Passo a passo para começar a automatizar respostas e organizar o atendimento.",
    excerpt:
      "Passo a passo para começar a automatizar respostas e organizar o atendimento.",
    date: "2025-03-10",
    content: `
      <p>Automatizar atendimento no WhatsApp não é magia: é planejamento e ferramenta certa.</p>
      <h2>Passo 1: Mapeie as perguntas frequentes</h2>
      <p>O que os clientes mais perguntam? Horário, preço, entrega, status do pedido? Anote tudo. Essas serão as primeiras respostas automáticas.</p>
      <h2>Passo 2: Defina o fluxo</h2>
      <p>Para cada pergunta, qual deve ser a resposta? E quando a pessoa quiser falar com alguém? A conversa segue para a equipe com o histórico.</p>
      <h2>Passo 3: Escolha a plataforma</h2>
      <p>Prefira soluções com integração oficial Meta (WhatsApp Business API). Evite atalhos que violam os termos do WhatsApp.</p>
      <h2>Passo 4: Teste antes de ir ao ar</h2>
      <p>Simule conversas reais. Veja se as respostas fazem sentido e se o handoff funciona.</p>
      <p><a href="/demo">Teste a demonstração da DevFlow</a> para ver como um fluxo automatizado funciona.</p>
    `,
  },
  {
    slug: "chatbot-whatsapp-vale-pena",
    title: "Chatbot para WhatsApp: vale a pena?",
    description:
      "Quando um bot de atendimento faz sentido — e quando não faz.",
    excerpt:
      "Quando um bot de atendimento faz sentido — e quando não faz.",
    date: "2025-03-09",
    content: `
      <p>Chatbot para WhatsApp: vale a pena? Depende.</p>
      <h2>Quando vale a pena</h2>
      <ul>
        <li>Você recebe muitas mensagens repetidas (horário, preço, entrega)</li>
        <li>Sua equipe perde tempo com perguntas que um bot resolve</li>
        <li>Clientes reclamam de demora ou falta de resposta</li>
      </ul>
      <h2>Quando não vale</h2>
      <ul>
        <li>Pouquíssimo volume de mensagens</li>
        <li>Atendimento muito personalizado, sem padrão</li>
        <li>Sem equipe para cuidar do bot e do handoff</li>
      </ul>
      <h2>O segredo: handoff humano</h2>
      <p>Um chatbot não substitui a equipe. Ele cobre o repetitivo que foi permitido e encaminha a conversa quando uma pessoa precisa entrar.</p>
      <p><a href="/chatbot-whatsapp">Saiba mais sobre chatbot WhatsApp</a> da DevFlow Labs.</p>
    `,
  },
  {
    slug: "5-erros-atendimento-whatsapp-perdem-clientes",
    title:
      "5 erros no atendimento pelo WhatsApp que fazem empresas perderem clientes",
    description:
      "O que evitar para não perder vendas e reputação no atendimento.",
    excerpt:
      "O que evitar para não perder vendas e reputação no atendimento.",
    date: "2025-03-08",
    content: `
      <p>Atendimento ruim no WhatsApp custa caro: cliente vai embora e conta para outros.</p>
      <h2>1. Demora para responder</h2>
      <p>Cliente espera horas? Ele já procurou outro. Resposta rápida ou automação fazem diferença.</p>
      <h2>2. Resposta genérica demais</h2>
      <p>Parecer robótico afasta. O ideal é automação que soa natural e encaminha para humano quando preciso.</p>
      <h2>3. Ignorar a mensagem</h2>
      <p>Deixar no vácuo é o pior. Se a equipe não puder responder agora, um fluxo pode dar o retorno que foi configurado e deixar a conversa na fila.</p>
      <h2>4. Sem organização</h2>
      <p>Mensagens perdidas, ninguém sabe quem respondeu o quê. Use uma plataforma que centralize e organize.</p>
      <h2>5. Bot sem handoff</h2>
      <p>Bot que não encaminha para humano frustra. O cliente pede atendente e continua falando com máquina? Péssimo.</p>
      <p><a href="/automacao-whatsapp">Conheça a automação DevFlow</a> com handoff para a equipe.</p>
    `,
  },
  {
    slug: "automacao-whatsapp-restaurante",
    title: "Automação de WhatsApp para restaurantes: pedidos e atendimento",
    description:
      "Como restaurantes usam WhatsApp para receber pedidos, confirmar horários e reduzir fila no balcão.",
    excerpt:
      "Como restaurantes usam WhatsApp para receber pedidos, confirmar horários e reduzir fila no balcão.",
    date: "2025-03-15",
    content: `
      <p>Restaurante que atende por WhatsApp sabe: o celular não para. Pedidos, dúvidas de cardápio, horário de funcionamento e pedido para viagem. Automação ajuda a organizar tudo sem deixar ninguém no vácuo.</p>
      <h2>O que automatizar primeiro</h2>
      <ul>
        <li><strong>Horário e endereço</strong> — a resposta sai do que a casa configurou no fluxo</li>
        <li><strong>Cardápio e preços</strong> — link ou mensagem automática com o que tem no dia</li>
        <li><strong>Formas de pagamento e entrega</strong> — delivery, retirada, tempo estimado</li>
      </ul>
      <h2>Pedidos pelo WhatsApp</h2>
      <p>Quando a pessoa manda o pedido por mensagem, um fluxo pode confirmar o que foi configurado: itens, valor e endereço. Quem quiser falar com alguém segue para a equipe, com o histórico.</p>
      <h2>Restaurante pequeno também usa?</h2>
      <p>Sim. Não precisa de sistema gigante. Basta mapear as 5–10 perguntas que mais repetem e automatizar as respostas. O resto segue com humano.</p>
      <p><a href="/automacao-whatsapp-restaurante">Automação WhatsApp para restaurantes</a> — veja a solução DevFlow para o setor.</p>
    `,
  },
  {
    slug: "chatbot-whatsapp-vendas",
    title: "Chatbot no WhatsApp para vendas: como usar a seu favor",
    description:
      "Use chatbot para qualificar leads, enviar catálogo e encaminhar para vendedor no momento certo.",
    excerpt:
      "Use chatbot no WhatsApp para qualificar leads, enviar catálogo e encaminhar para vendedor no momento certo.",
    date: "2025-03-14",
    content: `
      <p>WhatsApp também é canal de venda. Um fluxo pode responder preço e disponibilidade que foram configurados e passar a conversa para o vendedor quando uma pessoa precisa fechar.</p>
      <h2>O que o bot pode fazer na venda</h2>
      <ul>
        <li>Responder horário, preço e disponibilidade sem demora</li>
        <li>Enviar catálogo, link da loja ou PDF quando o cliente pedir</li>
        <li>Perguntar o que a pessoa precisa e encaminhar para humano com contexto</li>
      </ul>
      <h2>Quando o humano entra</h2>
      <p>Assim que o cliente demonstra intenção de compra, pede orçamento ou quer falar com alguém, o bot deve transferir a conversa. Nada de deixar o lead esperando ou falando só com máquina.</p>
      <h2>O que a equipe acompanha</h2>
      <p>Quem está com a conversa e o que ainda precisa de resposta. A operação não publica meta de conversão.</p>
      <p><a href="/chatbot-whatsapp">Chatbot para WhatsApp</a> e <a href="/automacao-whatsapp">automação DevFlow</a> — ferramentas para vendas pelo WhatsApp.</p>
    `,
  },
  {
    slug: "reduzir-custo-operacional-automacao",
    title: "Como reduzir custo operacional com automação no WhatsApp",
    description:
      "Menos tempo em tarefa repetitiva, mais tempo em what matters. Como automação corta custo e melhora atendimento.",
    excerpt:
      "Menos tempo em tarefa repetitiva, mais tempo no que importa. Como automação corta custo e melhora atendimento.",
    date: "2025-03-13",
    content: `
      <p>Custo operacional sobe quando muita gente faz a mesma coisa manualmente: responder "qual o horário?", "tem em estoque?", "qual o prazo?". Automação no WhatsApp tira parte desse peso e deixa a equipe para o que realmente precisa de humano.</p>
      <h2>Onde a automação corta custo</h2>
      <ul>
        <li><strong>Respostas repetidas</strong> — a automação pode responder o que foi permitido, quando está ativa</li>
        <li><strong>Triagem</strong> — cliente já chega com contexto quando é passado para humano</li>
        <li><strong>Menos erro</strong> — resposta padronizada evita informação errada ou esquecida</li>
      </ul>
      <h2>Não é "trocar gente por bot"</h2>
      <p>É realocar tempo. A equipe deixa de repetir as mesmas respostas e fica com as conversas que exigem contexto.</p>
      <h2>Por onde começar</h2>
      <p>Liste as perguntas que mais se repetem. Automatize essas. Mantenha o encaminhamento para a equipe quando a conversa exigir contexto.</p>
      <p><a href="/automacao-whatsapp">Automação WhatsApp DevFlow</a> — a arquitetura foi desenvolvida para organizar operações de atendimento via WhatsApp. <a href="/planilha-vs-app-financeiro">Leia também: planilha vs app financeiro</a> para organizar custos do dia a dia.</p>
    `,
  },
];

export const blogSlugs = blogArticles.map((a) => a.slug);

export function getBlogArticleBySlug(slug: string): BlogArticle | undefined {
  return blogArticles.find((a) => a.slug === slug);
}
