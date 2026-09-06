import re

with open("frontend/src/pages/tv/[tenantId].tsx", "r") as f:
    content = f.read()

# Add queueStatus state
content = content.replace("const [queueInfo, setQueueInfo] = useState<AnyFixMe | null>(null);", "const [queueInfo, setQueueInfo] = useState<AnyFixMe | null>(null);\n  const [isPaused, setIsPaused] = useState(false);")

# Update setQueueInfo to set isPaused
content = content.replace("if (data) setQueueInfo({ name: data.name, serviceName: data.service?.name });", "if (data) {\n          setQueueInfo({ name: data.name, serviceName: data.service?.name });\n          setIsPaused(data.status === 'PAUSED');\n        }")

# Listen to WebSocket event for queue_status_changed
ws_event = """    socket.on('queue_status_changed', (data: any) => {
      if (queueId && data.queueId === queueId) {
         setIsPaused(data.status === 'PAUSED');
      }
    });"""

content = content.replace("socket.on('token_serving', (data: AnyFixMe) => {", ws_event + "\n\n    socket.on('token_serving', (data: AnyFixMe) => {")

# Add Banner UI below the Header
banner_ui = """
          {isPaused && (
            <div className="bg-amber-500/20 border border-amber-500/30 text-amber-500 rounded-2xl p-6 flex flex-col items-center justify-center animate-pulse shadow-[0_0_40px_rgba(245,158,11,0.2)]">
              <span className="material-symbols-outlined text-[48px] mb-2">pause_circle</span>
              <h2 className="text-3xl font-bold uppercase tracking-widest">Service Temporarily Paused</h2>
              <p className="text-xl mt-2 opacity-90">Operator is on a short break. Thank you for your patience.</p>
            </div>
          )}
          """

content = content.replace("{/* Main content / media zone */}", banner_ui + "\n          {/* Main content / media zone */}")

with open("frontend/src/pages/tv/[tenantId].tsx", "w") as f:
    f.write(content)

