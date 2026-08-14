import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  closeSync,
  constants as fsConstants,
  fstatSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import process from "node:process";
import test from "node:test";
import { fileURLToPath } from "node:url";

// O_NOFOLLOW protege apenas o ultimo componente; cada ancestral e verificado
// antes, para que trocar .github por um link nao redirecione as leituras.
const lerRegular = (p) => {
  const partes = p.split("/");
  let ancestral = "";
  for (const parte of partes.slice(0, -1)) {
    ancestral = ancestral ? ancestral + "/" + parte : parte;
    const st = lstatSync(ancestral);
    if (st.isSymbolicLink() || !st.isDirectory())
      throw new Error(ancestral + " must be a real directory, not a symlink");
  }
  const fd = openSync(p, fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW);
  try {
    if (!fstatSync(fd).isFile())
      throw new Error(p + " must be a regular file, not a symlink");
    return readFileSync(fd, "utf8");
  } finally {
    closeSync(fd);
  }
};

const workflow = lerRegular(".github/workflows/add-to-project.yml");
const normaliza = (s) => s.replace(/(["'])([\w-]+)\1(\s*:)/g, "$2$3");
const normalized = normaliza(workflow);

// Quadro dedicado DESTE repositorio — pinado; retargeting reprova.
const QUADRO = "11";

const ESPERADO = [
  "name: Add to project",
  "",
  "# Coloca toda issue e todo pull request nos quadros do repositorio e do portfolio.",
  "# Inerte enquanto a variavel LCV_PROJECTS_APP_CLIENT_ID nao estiver definida na organizacao.",
  "#",
  "# Pre-requisito (acao do operador): GitHub App da organizacao instalado neste repositorio.",
  "# O passo de mint abaixo solicita tres permissoes e o token NAO e emitido se a instalacao",
  "# nao conceder cada uma delas:",
  "#   - projects de organizacao: leitura e escrita (permissao de projects de repositorio nao basta)",
  "#   - issues: leitura",
  "#   - pull requests: leitura",
  "# Alem do App, precisam existir:",
  "#   - variavel de organizacao LCV_PROJECTS_APP_CLIENT_ID",
  "#   - secret LCV_PROJECTS_APP_PRIVATE_KEY no environment 'projects-automation' deste repo",
  "# GITHUB_TOKEN nao acessa Projects v2, por isso o App e obrigatorio.",
  "#",
  "# Backfill na ativacao (uma unica vez): definir a variavel NAO reprocessa eventos",
  "# passados — issues/PRs abertos enquanto o workflow esteve inerte nao entram nos quadros",
  "# por este gatilho. Ao ativar, adicionar aos dois quadros os itens abertos que ainda nao",
  "# estejam neles (addProjectV2ItemById), conforme checklist da issue de rastreamento desta",
  "# implantacao.",
  "#",
  "# Por que pull_request_target: em PR de fork o evento pull_request roda sem os secrets do",
  "# repositorio e o mint da chave do App falharia; pull_request_target roda no contexto da",
  "# base e alcanca o secret do environment. Essa e a cobertura que este gatilho garante.",
  "#",
  "# PR do Dependabot: cobertura NAO garantida por este gatilho. A documentacao publica nao",
  "# resolve o caso — afirma que \"Your secrets are available in Dependabot secrets rather",
  "# than as GitHub Actions secrets\" e, em outra pagina, que pull_request_target \"does not",
  "# have these limitations\", sem dizer qual secret store vale em pull_request_target",
  "# disparado pelo Dependabot. Portanto NAO se promete cobertura de Dependabot aqui: na",
  "# ativacao, um PR de Dependabot de teste decide empiricamente; se o mint falhar, a",
  "# cobertura desses PRs vem de reconciliacao por evento confiavel (workflow_run ou",
  "# agendado, sem executar codigo do PR), e nao deste gatilho.",
  "#",
  "# Segunda lacuna conhecida do gatilho, esta documentada pelo GitHub: \"branches with names",
  "# that match certain patterns (such as those which look similar to SHAs) may not trigger",
  "# workflows with the pull_request_target event\". PR aberto de um branch com nome parecido",
  "# com SHA pode simplesmente nao disparar este workflow. Vale a mesma saida do caso",
  "# Dependabot: reconciliacao por evento confiavel cobre o que o gatilho nao alcanca.",
  "#",
  "# Em resumo, este gatilho garante PR de fork com nome de branch comum; Dependabot e",
  "# branch com cara de SHA sao lacunas conhecidas e declaradas, nao promessas quebradas.",
  "#",
  "# Este workflow usa somente metadados e NAO faz checkout nem executa codigo do PR —",
  "# invariante que mantem o gatilho privilegiado seguro e justifica a excecao estreita do",
  "# zizmor na linha do gatilho. Se algum passo futuro precisar de checkout, a excecao deixa",
  "# de valer e o gatilho volta a pull_request.",
  "",
  "on:",
  "  issues:",
  "    # transferred cobre a issue transferida PARA este repositorio: o README da action",
  "    # pinada lista o evento como o caminho suportado para \"Issues... transferred into",
  "    # your repository\", e a adicao e idempotente (re-adicionar devolve o mesmo item).",
  "    types: [opened, reopened, transferred]",
  "  pull_request_target: # zizmor: ignore[dangerous-triggers] -- sem checkout e sem execucao de codigo do PR; somente metadados; secret do environment para PR de fork (cobertura de Dependabot nao garantida: decidida por sonda na ativacao)",
  "    types: [opened, reopened, ready_for_review]",
  "",
  "# Scorecard TokenPermissions exige um bloco permissions em escopo de workflow; a politica",
  "# enterprise revogou write-all (Discussion .github#150, 11/08/2026). Nenhum passo deste",
  "# workflow usa o GITHUB_TOKEN — o token do App e emitido e repassado explicitamente —,",
  "# entao o conjunto vazio e o privilegio minimo real.",
  "permissions: {}",
  "",
  "env:",
  "  FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: \"true\"",
  "",
  "concurrency:",
  "  group: add-to-project-${{ github.event.issue.number || github.event.pull_request.number }}",
  "  cancel-in-progress: false",
  "",
  "jobs:",
  "  add:",
  "    name: Add item to projects",
  "    # Dependabot fica fora da cobertura deste gatilho (declarado acima); sem esta",
  "    # guarda, apos a ativacao cada PR dele falharia no mint e viraria ruido vermelho.",
  "    if: ${{ vars.LCV_PROJECTS_APP_CLIENT_ID != '' && github.actor != 'dependabot[bot]' }}",
  "    runs-on: ubuntu-latest",
  "    timeout-minutes: 10",
  "    permissions: {}",
  "    # Confina a chave privada do App a este job (zizmor secrets-outside-env).",
  "    # Mesmo padrao ja usado pela organizacao para credenciais de automacao.",
  "    # deployment: false — usa os secrets do environment sem criar um deployment",
  "    # object por evento de issue/PR (senao cada evento polui o historico de",
  "    # deployments e aciona integracoes de deployment).",
  "    environment:",
  "      name: projects-automation",
  "      deployment: false",
  "    steps:",
  "      - name: Mint installation token",
  "        id: token",
  "        uses: actions/create-github-app-token@bcd2ba49218906704ab6c1aa796996da409d3eb1 # v3.2.0",
  "        env:",
  "          # zizmor secrets-outside-env: segredo so pode ser referenciado via env",
  "          APP_PRIVATE_KEY: ${{ secrets.LCV_PROJECTS_APP_PRIVATE_KEY }}",
  "        with:",
  "          client-id: ${{ vars.LCV_PROJECTS_APP_CLIENT_ID }}",
  "          private-key: ${{ env.APP_PRIVATE_KEY }}",
  "          owner: ${{ github.repository_owner }}",
  "          # zizmor github-app: token restrito a este repositorio e as permissoes minimas",
  "          repositories: ${{ github.event.repository.name }}",
  "          permission-organization-projects: write",
  "          permission-issues: read",
  "          permission-pull-requests: read",
  "",
  "      - name: Add to repository project",
  "        uses: actions/add-to-project@5afcf98fcd03f1c2f92c3c83f58ae24323cc57fd # v2.0.0",
  "        with:",
  "          project-url: https://github.com/orgs/LCV-Ideas-Software/projects/__QUADRO__",
  "          github-token: ${{ steps.token.outputs.token }}",
  "",
  "      - name: Add to portfolio project",
  "        uses: actions/add-to-project@5afcf98fcd03f1c2f92c3c83f58ae24323cc57fd # v2.0.0",
  "        with:",
  "          project-url: https://github.com/orgs/LCV-Ideas-Software/projects/17",
  "          github-token: ${{ steps.token.outputs.token }}",
].join("\n");
const template = new RegExp(
  "^" +
    ESPERADO.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace("__QUADRO__", QUADRO) +
    "\\n$",
);

test("the privileged projects workflow matches its approved template exactly", () => {
  assert.match(workflow, template);
});

test("the privileged projects workflow never executes PR-controlled code", () => {
  assert.match(workflow, /pull_request_target: # zizmor: ignore\[dangerous-triggers\]/);
  assert.doesNotMatch(normalized, /\brun\s*:/);
  assert.doesNotMatch(normalized, /actions\/checkout|actions\/cache/);
  assert.doesNotMatch(normalized, /download-artifact|upload-artifact/);
  assert.doesNotMatch(normalized, /continue-on-error/);
  assert.doesNotMatch(normalized, /uses\s*:\s*\.\//);
  assert.doesNotMatch(normalized, /\bcontainer\s*:/);
  assert.doesNotMatch(normalized, /\bservices\s*:/);
  assert.doesNotMatch(normalized, /NODE_OPTIONS/i);
  const envKeys = [...normalized.matchAll(/^\s*([A-Z][A-Z0-9_]+)\s*:/gm)].map((m) => m[1]);
  assert.deepEqual(envKeys, ["FORCE_JAVASCRIPT_ACTIONS_TO_NODE24", "APP_PRIVATE_KEY"]);
});

test("the projects workflow bans YAML mechanics that could disguise a key", () => {
  assert.doesNotMatch(workflow, /\\/);
  // & isolado = ancora YAML (banida); && = operador de expressao (permitido)
  assert.doesNotMatch(workflow, /(?<!&)&(?!&)/);
  assert.doesNotMatch(workflow, /\*/);
  assert.doesNotMatch(workflow, /\?/);
  assert.doesNotMatch(workflow, /^\s*<</m);
  assert.doesNotMatch(workflow, /!![A-Za-z]/);
  assert.doesNotMatch(workflow, /^%/m);
});

test("the projects workflow uses exactly the two pinned metadata actions", () => {
  const uses = [...normalized.matchAll(/uses\s*:\s*["']?([^\s,"'}\]]+)/g)].map((m) => m[1]);
  assert.deepEqual(uses, [
    "actions/create-github-app-token@bcd2ba49218906704ab6c1aa796996da409d3eb1",
    "actions/add-to-project@5afcf98fcd03f1c2f92c3c83f58ae24323cc57fd",
    "actions/add-to-project@5afcf98fcd03f1c2f92c3c83f58ae24323cc57fd",
  ]);
});

test("inbound transfers stay covered, per the pinned action contract", () => {
  assert.match(workflow, /types: \[opened, reopened, transferred\]/);
});

// O carrier deste repositorio e um workflow proprio (o Dependency Review daqui
// foi saneado e roda somente em merge_group). Canon por igualdade do arquivo
// inteiro: gate de origem, supressao de erro, troca de comando ou insercao de
// passo reprovam por construcao.
const CANON_CARRIER = [
  "name: Projects workflow boundaries",
  "",
  "# Assercao do invariante do workflow privilegiado add-to-project.yml.",
  "# O carrier de Dependency Review deste repositorio foi saneado e passou a rodar",
  "# somente em merge_group, entao nao ha nele um job de pull_request onde fiar esta",
  "# verificacao — ela vive em workflow proprio, que roda em TODA origem (inclusive",
  "# fork, evento sem secrets) e tambem no merge_group.",
  "#",
  "# Para virar gate de merge, o contexto \"Projects workflow boundaries\" precisa ser",
  "# exigido no ruleset de main (acao do operador; pedido registrado em .github#147).",
  "# Enquanto nao for exigido, ele roda e fica visivel, mas nao bloqueia.",
  "on:",
  "  pull_request:",
  "    branches:",
  "      - main",
  "  merge_group:",
  "    types:",
  "      - checks_requested",
  "",
  "permissions: {}",
  "",
  "concurrency:",
  "  group: projects-workflow-boundaries-${{ github.ref }}",
  "  cancel-in-progress: true",
  "",
  "jobs:",
  "  projects_workflow_boundaries:",
  "    name: Projects workflow boundaries",
  "    runs-on: ubuntu-latest",
  "    timeout-minutes: 10",
  "    permissions:",
  "      contents: read # apenas checkout do candidato e do ref base protegido",
  "    steps:",
  "      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1",
  "        with:",
  "          persist-credentials: false",
  "      # O verificador NAO pode vir apenas da arvore do candidato: um PR que altere",
  "      # o workflow privilegiado E o proprio verificador se auto-aprovaria. A copia",
  "      # confiavel vem do ref base protegido (main). Bootstrap: enquanto main ainda",
  "      # nao contiver o verificador (este PR o introduz), usa-se a copia do",
  "      # candidato — desvio que morre no primeiro merge.",
  "      - name: Ensure a clean, non-symlinked trusted destination",
  "        run: rm -rf .trusted-boundary",
  "      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1",
  "        with:",
  "          persist-credentials: false",
  "          ref: main",
  "          path: .trusted-boundary",
  "      - name: Test projects automation workflow boundaries",
  "        run: |",
  "          if [ -L .trusted-boundary ]; then",
  "            echo \"::error::.trusted-boundary must be a real directory, not a symlink\"",
  "            exit 1",
  "          fi",
  "          verificador=\".github/scripts/add-to-project-workflow.regression.mjs\"",
  "          confiavel=\".trusted-boundary/${verificador}\"",
  "          if [ -f \"${confiavel}\" ]; then",
  "            node --test \"${confiavel}\"",
  "          else",
  "            echo \"Bootstrap: verificador ausente em main; usando a copia do candidato.\"",
  "            node --test \"${verificador}\"",
  "          fi",
].join("\n");

test("the boundary carrier equals its canonical definition", () => {
  const carrier = lerRegular(".github/workflows/projects-workflow-boundaries.yml");
  assert.equal(carrier.trimEnd(), CANON_CARRIER.trimEnd());
});

// Rotacao do verificador — defesa em profundidade, nao prova. O gate real e
// humano e fica fora do candidato: CODEOWNERS sobre .github/scripts/ e
// .github/workflows/ mais aprovacao de code owner exigida no ruleset.
test("a candidate verifier rotation keeps killing the known mutants", () => {
  const self = readFileSync(fileURLToPath(import.meta.url), "utf8");
  const candidato = lerRegular(".github/scripts/add-to-project-workflow.regression.mjs");
  if (candidato === self) return;

  const raiz = mkdtempSync(join(tmpdir(), "rotacao-"));
  const escreve = (wfTexto, carrierTexto) => {
    const base = mkdtempSync(join(raiz, "caso-"));
    mkdirSync(join(base, ".github", "workflows"), { recursive: true });
    mkdirSync(join(base, ".github", "scripts"), { recursive: true });
    writeFileSync(join(base, ".github", "workflows", "add-to-project.yml"), wfTexto);
    writeFileSync(join(base, ".github", "workflows", "projects-workflow-boundaries.yml"), carrierTexto);
    writeFileSync(join(base, ".github", "scripts", "add-to-project-workflow.regression.mjs"), candidato);
    return base;
  };
  const envLimpo = { ...process.env };
  delete envLimpo.NODE_TEST_CONTEXT;
  delete envLimpo.NODE_OPTIONS;
  const roda = (base) => {
    try {
      execFileSync(process.execPath, ["--test", ".github/scripts/add-to-project-workflow.regression.mjs"], {
        cwd: base, encoding: "utf8", stdio: "pipe", env: envLimpo,
      });
      return true;
    } catch {
      return false;
    }
  };
  const carrierAtual = lerRegular(".github/workflows/projects-workflow-boundaries.yml");
  assert.ok(roda(escreve(workflow, carrierAtual)), "candidate verifier must accept the current pair");
  const mutantes = [
    ["passo run", workflow.replace("    steps:", "    steps:\n      - { run: echo pwned }"), carrierAtual],
    ["input extra na action de mint", workflow.replace("          owner:", "          github-api-url: https://attacker.example\n          owner:"), carrierAtual],
    ["quadro do repositorio trocado", workflow.replace("/projects/" + QUADRO + "\n", "/projects/999999\n"), carrierAtual],
    ["gate de origem no carrier", workflow, carrierAtual.replace("  projects_workflow_boundaries:\n    name:", "  projects_workflow_boundaries:\n    if: ${{ github.event.pull_request.head.repo.full_name == github.repository }}\n    name:")],
  ];
  for (const [nome, wfM, caM] of mutantes) {
    assert.ok(wfM !== workflow || caM !== carrierAtual, "mutant not applied: " + nome);
    assert.ok(!roda(escreve(wfM, caM)), "candidate verifier must reject the mutant: " + nome);
  }
});
