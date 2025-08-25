/**
 * スクリプトプロパティにパスワードを設定する関数
 * 一度実行すれば設定完了
 */
function setupPasswords() {
  const properties = PropertiesService.getScriptProperties();
  
  // 管理者パスワード（既存のものがあれば維持、なければ設定）
  if (!properties.getProperty('ADMIN_PASSWORD')) {
    properties.setProperty('ADMIN_PASSWORD', 'admin');
    console.log('管理者パスワードを設定しました: admin');
  } else {
    console.log('管理者パスワードは既に設定済みです');
  }
  
  // 当日券モードパスワード
  properties.setProperty('WALKIN_PASSWORD', 'walkin');
  console.log('当日券モードパスワードを設定しました: walkin');
}

/**
 * 設定されているパスワードを確認する関数（デバッグ用）
 */
function checkPasswords() {
  const properties = PropertiesService.getScriptProperties();
  console.log('管理者パスワード:', properties.getProperty('ADMIN_PASSWORD'));
  console.log('当日券パスワード:', properties.getProperty('WALKIN_PASSWORD'));
}