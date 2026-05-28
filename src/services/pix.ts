/**
 * Utilitário de Geração de QR Code Pix Estático com Valor Dinâmico.
 * Compatível com o padrão oficial do Banco Central do Brasil (BR Code / EMV QRCPS).
 */

/**
 * Remove acentos e caracteres especiais para compatibilidade total com os aplicativos bancários.
 */
export function sanitizarTexto(texto: string, maxLength: number): string {
  if (!texto) return '';
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove acentos
    .replace(/[^a-zA-Z0-9 ]/g, "") // Remove qualquer caractere que não seja letra, número ou espaço
    .substring(0, maxLength)
    .trim();
}

/**
 * Calcula o checksum CRC16-CCITT de validação da string Pix.
 * Polinômio: 0x1021 | Valor Inicial: 0xFFFF
 */
export function calcularCRC16(str: string): string {
  let crc = 0xFFFF;
  const polynomial = 0x1021;

  for (let i = 0; i < str.length; i++) {
    const charCode = str.charCodeAt(i);
    crc ^= (charCode << 8);
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ polynomial) & 0xFFFF;
      } else {
        crc = (crc << 1) & 0xFFFF;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Gera a string Payload do Pix Copia e Cola.
 * 
 * @param chave Chave Pix cadastrada (CPF, CNPJ, E-mail, Celular ou Chave Aleatória)
 * @param nome Nome do beneficiário (máx 25 caracteres no banco)
 * @param cidade Cidade do beneficiário (máx 15 caracteres no banco)
 * @param valor Valor total da transação em reais (BRL)
 * @param txid Identificador da transação (alfanumérico, sem espaços, máx 25 caracteres)
 */
export function gerarPayloadPix(
  chave: string,
  nome: string,
  cidade: string,
  valor: number,
  txid: string = '***'
): string {
  // Helper para formatar campos no padrão EMV: [ID da Tag][Tamanho com 2 dígitos][Valor]
  const formatTag = (id: string, value: string) => {
    return id + String(value.length).padStart(2, '0') + value;
  };

  // 00 - Payload Format Indicator (Sempre 01)
  const tag00 = formatTag('00', '01');

  // 26 - Merchant Account Information - Pix
  const gui = formatTag('00', 'br.gov.bcb.pix');
  const key = formatTag('01', chave.trim());
  const tag26 = formatTag('26', gui + key);

  // 52 - Merchant Category Code (Sempre 0000 para genérico)
  const tag52 = formatTag('52', '0000');

  // 53 - Transaction Currency (986 é o código ISO para Real - BRL)
  const tag53 = formatTag('53', '986');

  // 54 - Transaction Amount (Valor formatado com duas casas decimais, ponto como separador)
  const valorFormatado = valor.toFixed(2);
  const tag54 = formatTag('54', valorFormatado);

  // 58 - Country Code (Sempre BR)
  const tag58 = formatTag('58', 'BR');

  // 59 - Merchant Name (Nome do recebedor, máx 25 chars)
  const nomeSani = sanitizarTexto(nome, 25);
  const tag59 = formatTag('59', nomeSani || 'LOJA THORDER');

  // 60 - Merchant City (Cidade do recebedor, máx 15 chars)
  const cidadeSani = sanitizarTexto(cidade, 15);
  const tag60 = formatTag('60', cidadeSani || 'CAJURU');

  // 62 - Additional Data Field Template (TxID)
  // O TxID deve ser alfanumérico, sem espaços e máx 25 caracteres. Padrão Pix Estático: '***' ou código limpo.
  const txidLimpo = txid.replace(/[^a-zA-Z0-9]/g, '').substring(0, 25) || '***';
  const txidTag = formatTag('05', txidLimpo);
  const tag62 = formatTag('62', txidTag);

  // Concatenação de todas as partes para formar o pré-payload (sem o CRC)
  let prePayload = tag00 + tag26 + tag52 + tag53 + tag54 + tag58 + tag59 + tag60 + tag62;

  // Adiciona a tag de abertura do CRC: tag 63 de tamanho 04
  prePayload += '6304';

  // Calcula o CRC16-CCITT de toda a string gerada
  const crc = calcularCRC16(prePayload);

  // Retorna a string Pix completa (Copia e Cola)
  return prePayload + crc;
}
