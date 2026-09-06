import re

with open("backend/src/queue/queue.service.ts", "r") as f:
    content = f.read()

old_broadcast = """    this.queueGateway.broadcastQueueUpdate(queueId, 'queue_status_changed', {
      status,
    });"""

new_broadcast = """    this.queueGateway.broadcastQueueUpdate(queueId, 'queue_status_changed', {
      queueId,
      status,
    });
    this.queueGateway.broadcastTenantUpdate(queue.tenantId, 'queue_status_changed', {
      queueId,
      status,
    });"""

content = content.replace(old_broadcast, new_broadcast)

with open("backend/src/queue/queue.service.ts", "w") as f:
    f.write(content)

