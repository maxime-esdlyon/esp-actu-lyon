# Petit serveur local pour tester l'écran TV et l'outil interne (mode démo).
# Usage : ruby tools/serve.rb   puis ouvrir http://localhost:8090/
require 'webrick'
ROOT = File.expand_path('..', __dir__)
PORT = (ENV['PORT'] || 8090).to_i
server = WEBrick::HTTPServer.new(Port: PORT, AccessLog: [], Logger: WEBrick::Log.new($stderr, WEBrick::Log::WARN))
server.mount_proc('/') do |req, res|
  rel = WEBrick::HTTPUtils.unescape(req.path)
  if rel.split('/').include?('..')
    res.status = 403
    next
  end
  path = File.join(ROOT, rel)
  path = File.join(path, 'index.html') if File.directory?(path)
  if File.file?(path)
    res.body = File.binread(path)
    res['Content-Type'] = WEBrick::HTTPUtils.mime_type(path, WEBrick::HTTPUtils::DefaultMimeTypes.merge('svg' => 'image/svg+xml', 'json' => 'application/json', 'js' => 'text/javascript', 'webm' => 'video/webm', 'mp4' => 'video/mp4'))
    res['Cache-Control'] = 'no-store'
  else
    res.status = 404
    res.body = 'Introuvable : ' + rel
  end
end
trap('INT') { server.shutdown }
trap('TERM') { server.shutdown }
puts "Serveur local : http://localhost:#{PORT}/"
server.start
