# Cofre Senhas

<p align="center">
  <img src="assets/icon.png" alt="Ícone do Cofre Senhas" width="128" />
</p>

<p align="center">
  Gerenciador de senhas local, criptografado e protegido por senha mestre e biometria.
</p>

<p align="center">
  <img alt="Expo" src="https://img.shields.io/badge/Expo-54-000020?logo=expo" />
  <img alt="React Native" src="https://img.shields.io/badge/React%20Native-0.81-61DAFB?logo=react" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white" />
  <img alt="Plataforma Android" src="https://img.shields.io/badge/Android-API%2024%2B-3DDC84?logo=android&logoColor=white" />
</p>

## Sobre o projeto

O **Cofre Senhas** é um aplicativo mobile desenvolvido com React Native e Expo para armazenar credenciais diretamente no aparelho. O projeto funciona de forma local e mantém os dados de cada perfil em um banco SQLite separado.

Descrições e senhas são criptografadas antes de chegar ao banco. Durante o uso, o cofre pode ser desbloqueado pela senha mestre ou, em aparelhos compatíveis, pela biometria protegida pelo Keychain/Keystore do sistema.

## Principais recursos

- Criação de múltiplos perfis locais.
- Cofre e banco SQLite isolados por usuário.
- Login por senha mestre com derivação de chave usando `scrypt`.
- Desbloqueio opcional por impressão digital ou reconhecimento facial.
- Cadastro manual de credenciais.
- Gerador de senhas aleatórias ou memorizáveis.
- Edição da senha gerada antes de salvar.
- Visualização e cópia rápida de credenciais.
- Seleção e exclusão individual ou em lote, sempre com confirmação.
- Exclusão completa de perfil mediante confirmação da senha mestre.
- Interface escura, responsiva e adaptada à abertura do teclado.
- Funcionamento offline, sem permissão de internet no aplicativo Android de release.

## Segurança e privacidade

O projeto adota as seguintes medidas:

- A senha mestre não é armazenada diretamente e não pode ser recuperada.
- Cada perfil utiliza salt aleatório e uma chave de cofre exclusiva.
- O login é validado com `scrypt` (`N = 32768`, `r = 8`, `p = 1`).
- Credenciais são criptografadas com **XChaCha20-Poly1305**, fornecendo confidencialidade e autenticação dos dados.
- A chave do cofre é armazenada criptografada e permanece descriptografada somente em memória durante a sessão.
- A chave mantida em memória é apagada ao sair do perfil.
- O desbloqueio biométrico utiliza `expo-secure-store` com autenticação obrigatória do sistema.
- Alterações na biometria cadastrada invalidam a chave protegida e fazem a senha mestre voltar a ser exigida.
- Câmera, localização, microfone, mídia, notificações e outras permissões não utilizadas são bloqueadas no Android.
- A exclusão de credenciais exige confirmação e a exclusão de perfil exige a senha mestre.
- O repositório executa validação TypeScript e análise CodeQL em mudanças na branch principal.
- Dependabot monitora dependências npm, Gradle e GitHub Actions semanalmente.

> [!IMPORTANT]
> Não existe recuperação da senha mestre nesta versão. Se ela for esquecida e a biometria não estiver disponível, os dados criptografados não poderão ser acessados.

> [!NOTE]
> A área de transferência é controlada pelo sistema operacional. Depois de colar uma senha, limpe o conteúdo copiado quando possível.

## Tecnologias

- [React Native](https://reactnative.dev/)
- [Expo](https://expo.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [React Navigation](https://reactnavigation.org/)
- [React Native Paper](https://reactnativepaper.com/)
- [Expo SQLite](https://docs.expo.dev/versions/latest/sdk/sqlite/)
- [Expo SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/)
- [Expo LocalAuthentication](https://docs.expo.dev/versions/latest/sdk/local-authentication/)
- [Noble Ciphers](https://github.com/paulmillr/noble-ciphers)
- [Noble Hashes](https://github.com/paulmillr/noble-hashes)

## Estrutura do projeto

```text
├── android/       # Projeto Android nativo
├── assets/        # Ícones e imagens do aplicativo
├── components/    # Componentes reutilizáveis de interface
├── contexts/      # Estado de autenticação e credenciais
├── database/      # Persistência, isolamento e operações SQLite
├── navigation/    # Rotas e navegação do aplicativo
├── screens/       # Telas do fluxo de autenticação e do cofre
├── theme/         # Cores, espaçamentos e tema visual
├── types/         # Tipos compartilhados do TypeScript
└── utils/         # Criptografia e geração de senhas
```

## Pré-requisitos

- Node.js 20 LTS ou superior.
- Corepack habilitado.
- Yarn 4.12.0, definido no próprio projeto.
- Para Android nativo: Android Studio, Android SDK e JDK compatíveis com o Expo 54.
- Um aparelho físico é recomendado para validar a proteção biométrica real.

## Instalação

```bash
git clone https://github.com/FlavianoRS/Cofre-de-Senhas.git
cd Cofre-de-Senhas
corepack enable
corepack yarn install
```

## Executando o projeto

Inicie o servidor do Expo:

```bash
corepack yarn start
```

Outros comandos disponíveis:

```bash
corepack yarn android   # Executa no Android
corepack yarn ios       # Executa no iOS, em ambiente compatível
corepack yarn web       # Executa a versão web
corepack yarn typecheck # Valida os tipos TypeScript
```

O Face ID e algumas características do SecureStore não funcionam completamente no Expo Go. Para testar a biometria, utilize um development build ou um APK instalado em aparelho físico.

## Validação e build

Validação dos bundles:

```bash
corepack yarn typecheck
corepack yarn expo export --platform android
corepack yarn expo export --platform web
```

Build Android nativo:

```bash
cd android
./gradlew assembleRelease
```

No Windows:

```powershell
cd android
.\gradlew.bat assembleRelease
```

O APK será gerado em `android/app/build/outputs/apk/release/`.

### Assinatura segura da versão Android

O repositório não contém keystores nem credenciais de assinatura. Builds `release` falham intencionalmente enquanto as quatro propriedades obrigatórias não estiverem configuradas.

Gere a chave definitiva em uma pasta segura fora do projeto:

```powershell
keytool -genkeypair -v -keystore C:\secure\cofre-senhas-release.jks -alias cofre-senhas -keyalg RSA -keysize 4096 -validity 10000
```

Guarde as credenciais no arquivo global `~/.gradle/gradle.properties`, que fica fora do repositório:

```properties
COFRE_RELEASE_STORE_FILE=C:\\secure\\cofre-senhas-release.jks
COFRE_RELEASE_STORE_PASSWORD=SUBSTITUA_COM_SEGREDO
COFRE_RELEASE_KEY_ALIAS=cofre-senhas
COFRE_RELEASE_KEY_PASSWORD=SUBSTITUA_COM_SEGREDO
```

Em CI/CD, use segredos protegidos com os mesmos quatro nomes. Nunca salve esses valores em arquivos rastreados pelo Git.

> [!WARNING]
> Perder a keystore ou suas senhas impede a publicação de atualizações assinadas com a mesma identidade. Mantenha backups criptografados em pelo menos dois locais seguros.

No Windows, ferramentas Android/NDK podem falhar quando o caminho do projeto contém acentos ou é muito longo. Prefira um caminho curto e sem caracteres especiais, como `C:\dev\cofre-senhas`.

## Migração de dados antigos

Se for encontrado um banco legado chamado `password_manager.db`, suas credenciais são importadas para o primeiro cofre acessado, criptografadas e removidas da tabela antiga após a migração.

## Limitações atuais

- Os dados existem somente no aparelho; ainda não há sincronização ou backup remoto.
- Não existe recuperação de senha mestre.
- SSO e autenticação por provedores externos ainda não foram implementados.
- A versão iOS depende de compilação e testes em ambiente Apple compatível.

## Roadmap

- [ ] SSO com provedores externos.
- [ ] Sincronização criptografada entre dispositivos.
- [ ] Backup e restauração com criptografia de ponta a ponta.
- [ ] Recuperação segura de conta sem expor a chave do cofre.
- [ ] Auditoria de força e reutilização de senhas.
- [ ] Preparação da assinatura e distribuição oficial nas lojas.

## Contribuindo

Sugestões e correções são bem-vindas. Abra uma *issue* descrevendo o problema ou envie um *pull request* com uma alteração pequena, objetiva e validada pelo `typecheck`.

Ao relatar uma possível vulnerabilidade, evite publicar detalhes sensíveis em uma issue pública. Entre em contato diretamente com o responsável pelo repositório.

---

Desenvolvido para oferecer um cofre local simples, moderno e com foco em privacidade.
