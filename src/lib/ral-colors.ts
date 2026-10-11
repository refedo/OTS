// Approximate sRGB values for RAL Classic colours (display only)
export const RAL_HEX: Record<string, string> = {
  '1000': '#BEBD7F', '1001': '#C2B078', '1002': '#C6A664', '1003': '#E5BE01',
  '1004': '#CDA434', '1005': '#A98307', '1006': '#E4A010', '1007': '#DC9D00',
  '1011': '#8A6642', '1012': '#C7B446', '1013': '#EAE6CA', '1014': '#E1CC4F',
  '1015': '#E6D690', '1016': '#EDFF21', '1017': '#F5D033', '1018': '#F8F32B',
  '1019': '#9E9764', '1020': '#999950', '1021': '#F3DA0B', '1023': '#FAD201',
  '1024': '#AEA04B', '1027': '#9D9101', '1028': '#F4A900', '1032': '#D6AE01',
  '1033': '#F3A505', '1034': '#EFA94A', '1035': '#6A5D4D', '1036': '#705335',
  '1037': '#F39F18', '2000': '#ED760E', '2001': '#C93C20', '2002': '#CB2821',
  '2003': '#FF7514', '2004': '#F44611', '2008': '#F75E25', '2009': '#F54021',
  '2010': '#D84B20', '2011': '#EC7C26', '2012': '#E55137', '3000': '#AF2B1E',
  '3001': '#A52019', '3002': '#A2231D', '3003': '#9B111E', '3004': '#75151E',
  '3005': '#5E2129', '3007': '#412227', '3009': '#642424', '3011': '#781F19',
  '3012': '#C1876B', '3013': '#A12312', '3014': '#D36E70', '3015': '#EA899A',
  '3016': '#B32821', '3017': '#E63244', '3018': '#D53032', '3020': '#CC0605',
  '3022': '#D95030', '3027': '#C51D34', '3031': '#B32428', '4001': '#6D3F5B',
  '4002': '#922B3E', '4003': '#DE4C8A', '4004': '#641C34', '4005': '#6C4675',
  '4006': '#A03472', '4007': '#4A192C', '4008': '#924E7D', '4009': '#A18594',
  '5000': '#354D73', '5001': '#1F3438', '5002': '#20214F', '5003': '#1D1E33',
  '5004': '#18171C', '5005': '#1E2460', '5007': '#3E5F8A', '5008': '#26252D',
  '5009': '#025669', '5010': '#0E294B', '5011': '#231A24', '5012': '#3B83BD',
  '5013': '#1E213D', '5014': '#606E8C', '5015': '#2271B3', '5017': '#063971',
  '5018': '#3F888F', '5019': '#1B5583', '5020': '#1D334A', '5021': '#256D7B',
  '5022': '#252850', '5023': '#49678D', '5024': '#5D9B9B', '6000': '#316650',
  '6001': '#287233', '6002': '#2D572C', '6003': '#424632', '6004': '#1F3A3D',
  '6005': '#2F4538', '6006': '#3E3B32', '6007': '#343B29', '6008': '#39352A',
  '6009': '#31372B', '6010': '#35682D', '6011': '#587246', '6012': '#343E40',
  '6013': '#6C7156', '6014': '#47402E', '6015': '#3B3C36', '6016': '#1E5945',
  '6017': '#4C9141', '6018': '#57A639', '6019': '#BDECB6', '6020': '#2E3A23',
  '6021': '#89AC76', '6022': '#25221B', '6024': '#308446', '6025': '#3D642D',
  '6026': '#015D52', '6027': '#84C3BE', '6028': '#2C5545', '6029': '#20603D',
  '6032': '#317F43', '6033': '#497E76', '6034': '#7FB5B5', '7000': '#78858B',
  '7001': '#8A9597', '7002': '#7E7B52', '7003': '#6C7059', '7004': '#969992',
  '7005': '#646B63', '7006': '#6D6552', '7008': '#6A5F31', '7009': '#4D5645',
  '7010': '#4C514A', '7011': '#434B4D', '7012': '#4E5754', '7013': '#464531',
  '7015': '#434750', '7016': '#293133', '7021': '#23282B', '7022': '#332F2C',
  '7023': '#686C5E', '7024': '#474A51', '7026': '#2F353B', '7030': '#8B8C7A',
  '7031': '#474B4E', '7032': '#B8B799', '7033': '#7D8471', '7034': '#8F8B66',
  '7035': '#D7D7D7', '7036': '#7F7679', '7037': '#7D7F7D', '7038': '#B5B8B1',
  '7039': '#6C6960', '7040': '#9DA1AA', '7042': '#8D948D', '7043': '#4E5452',
  '7044': '#CAC4B0', '7045': '#909090', '7046': '#82898F', '7047': '#D0D0D0',
  '8000': '#826C34', '8001': '#955F20', '8002': '#6C3B2A', '8003': '#734222',
  '8004': '#8E402A', '8007': '#59351F', '8008': '#6F4F28', '8011': '#5B3A29',
  '8012': '#592321', '8014': '#382C1E', '8015': '#633A34', '8016': '#4C2F27',
  '8017': '#45322E', '8019': '#403A3A', '8022': '#212121', '8023': '#A65E2E',
  '8024': '#79553D', '8025': '#755C48', '8028': '#4E3B31', '9001': '#FDF4E3',
  '9002': '#E7EBDA', '9003': '#F4F4F4', '9004': '#282828', '9005': '#0A0A0A',
  '9006': '#A5A5A5', '9007': '#8F8F8F', '9010': '#FFFFFF', '9011': '#1C1C1C',
  '9016': '#F6F6F6', '9017': '#1E1E1E', '9018': '#D7D7D7',
};

export const RAL_NAMES: Record<string, string> = {
  '1000': 'Green Beige', '1001': 'Beige', '1002': 'Sand Yellow', '1003': 'Signal Yellow',
  '1004': 'Golden Yellow', '1005': 'Honey Yellow', '1006': 'Maize Yellow', '1007': 'Daffodil Yellow',
  '1011': 'Brown Beige', '1012': 'Lemon Yellow', '1013': 'Oyster White', '1014': 'Ivory',
  '1015': 'Light Ivory', '1016': 'Sulfur Yellow', '1017': 'Saffron Yellow', '1018': 'Zinc Yellow',
  '1019': 'Grey Beige', '1020': 'Olive Yellow', '1021': 'Colza Yellow', '1023': 'Traffic Yellow',
  '1024': 'Ochre Yellow', '1027': 'Curry', '1028': 'Melon Yellow', '1032': 'Broom Yellow',
  '1033': 'Dahlia Yellow', '1034': 'Pastel Yellow', '1035': 'Pearl Beige', '1036': 'Pearl Gold',
  '1037': 'Sun Yellow', '2000': 'Yellow Orange', '2001': 'Red Orange', '2002': 'Vermilion',
  '2003': 'Pastel Orange', '2004': 'Pure Orange', '2008': 'Bright Red Orange', '2009': 'Traffic Orange',
  '2010': 'Signal Orange', '2011': 'Deep Orange', '2012': 'Salmon Orange', '3000': 'Flame Red',
  '3001': 'Signal Red', '3002': 'Carmine Red', '3003': 'Ruby Red', '3004': 'Purple Red',
  '3005': 'Wine Red', '3007': 'Black Red', '3009': 'Oxide Red', '3011': 'Brown Red',
  '3012': 'Beige Red', '3013': 'Tomato Red', '3014': 'Antique Pink', '3015': 'Light Pink',
  '3016': 'Coral Red', '3017': 'Rose', '3018': 'Strawberry Red', '3020': 'Traffic Red',
  '3022': 'Salmon Pink', '3027': 'Raspberry Red', '3031': 'Orient Red', '4001': 'Red Lilac',
  '4002': 'Red Violet', '4003': 'Heather Violet', '4004': 'Claret Violet', '4005': 'Blue Lilac',
  '4006': 'Traffic Purple', '4007': 'Purple Violet', '4008': 'Signal Violet', '4009': 'Pastel Violet',
  '5000': 'Violet Blue', '5001': 'Green Blue', '5002': 'Ultramarine Blue', '5003': 'Sapphire Blue',
  '5004': 'Black Blue', '5005': 'Signal Blue', '5007': 'Brillant Blue', '5008': 'Grey Blue',
  '5009': 'Azure Blue', '5010': 'Gentian Blue', '5011': 'Steel Blue', '5012': 'Light Blue',
  '5013': 'Cobalt Blue', '5014': 'Pigeon Blue', '5015': 'Sky Blue', '5017': 'Traffic Blue',
  '5018': 'Turquoise Blue', '5019': 'Capri Blue', '5020': 'Ocean Blue', '5021': 'Water Blue',
  '5022': 'Night Blue', '5023': 'Distant Blue', '5024': 'Pastel Blue', '6000': 'Patina Green',
  '6001': 'Emerald Green', '6002': 'Leaf Green', '6003': 'Olive Green', '6004': 'Blue Green',
  '6005': 'Moss Green', '6006': 'Grey Olive', '6007': 'Bottle Green', '6008': 'Brown Green',
  '6009': 'Fir Green', '6010': 'Grass Green', '6011': 'Reseda Green', '6012': 'Black Green',
  '6013': 'Reed Green', '6014': 'Yellow Olive', '6015': 'Black Olive', '6016': 'Turquoise Green',
  '6017': 'May Green', '6018': 'Yellow Green', '6019': 'Pastel Green', '6020': 'Chrome Green',
  '6021': 'Pale Green', '6022': 'Olive Drab', '6024': 'Traffic Green', '6025': 'Fern Green',
  '6026': 'Opal Green', '6027': 'Light Green', '6028': 'Pine Green', '6029': 'Mint Green',
  '6032': 'Signal Green', '6033': 'Mint Turquoise', '6034': 'Pastel Turquoise', '7000': 'Squirrel Grey',
  '7001': 'Silver Grey', '7002': 'Olive Grey', '7003': 'Moss Grey', '7004': 'Signal Grey',
  '7005': 'Mouse Grey', '7006': 'Beige Grey', '7008': 'Khaki Grey', '7009': 'Green Grey',
  '7010': 'Tarpaulin Grey', '7011': 'Iron Grey', '7012': 'Basalt Grey', '7013': 'Brown Grey',
  '7015': 'Slate Grey', '7016': 'Anthracite Grey', '7021': 'Black Grey', '7022': 'Umbra Grey',
  '7023': 'Concrete Grey', '7024': 'Graphite Grey', '7026': 'Granite Grey', '7030': 'Stone Grey',
  '7031': 'Blue Grey', '7032': 'Pebble Grey', '7033': 'Cement Grey', '7034': 'Yellow Grey',
  '7035': 'Light Grey', '7036': 'Platinum Grey', '7037': 'Dusty Grey', '7038': 'Agate Grey',
  '7039': 'Quartz Grey', '7040': 'Window Grey', '7042': 'Traffic Grey A', '7043': 'Traffic Grey B',
  '7044': 'Silk Grey', '7045': 'Telegrey 1', '7046': 'Telegrey 2', '7047': 'Telegrey 4',
  '8000': 'Green Brown', '8001': 'Ochre Brown', '8002': 'Signal Brown', '8003': 'Clay Brown',
  '8004': 'Copper Brown', '8007': 'Fawn Brown', '8008': 'Olive Brown', '8011': 'Nut Brown',
  '8012': 'Red Brown', '8014': 'Sepia Brown', '8015': 'Chestnut Brown', '8016': 'Mahogany Brown',
  '8017': 'Chocolate Brown', '8019': 'Grey Brown', '8022': 'Black Brown', '8023': 'Orange Brown',
  '8024': 'Beige Brown', '8025': 'Pale Brown', '8028': 'Terra Brown', '9001': 'Cream',
  '9002': 'Grey White', '9003': 'Signal White', '9004': 'Signal Black', '9005': 'Jet Black',
  '9006': 'White Aluminium', '9007': 'Grey Aluminium', '9010': 'Pure White', '9011': 'Graphite Black',
  '9016': 'Traffic White', '9017': 'Traffic Black', '9018': 'Papyrus White',
};

export const RAL_FALLBACK_HEX = '#CCCCCC';

export function normalizeRal(ral: string | null | undefined): string {
  return (ral ?? '').replace(/[^0-9]/g, '');
}

export function isKnownRal(ral: string | null | undefined): boolean {
  return normalizeRal(ral) in RAL_HEX;
}

export function getRalHex(ral: string | null | undefined): string {
  return RAL_HEX[normalizeRal(ral)] ?? RAL_FALLBACK_HEX;
}

export function getRalName(ral: string | null | undefined): string {
  return RAL_NAMES[normalizeRal(ral)] ?? 'Unknown Color';
}
