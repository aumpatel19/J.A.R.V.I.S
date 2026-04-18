import { motion, AnimatePresence } from 'framer-motion';
import { Task } from '../../../../shared/types';

interface Props {
  tasks: Task[];
}

const STATUS_COLOR: Record<Task['status'], string> = {
  pending: '#0077ff',
  running: '#00f0ff',
  done:    '#00ff88',
  failed:  '#ff3344',
};

const STATUS_ICON: Record<Task['status'], string> = {
  pending: '○',
  running: '◎',
  done:    '✓',
  failed:  '✗',
};

export function TasksPanel({ tasks }: Props) {
  return (
    <div className="panel flex flex-col h-full rounded-lg overflow-hidden">
      <div className="px-3 py-2 border-b border-[#00f0ff22] flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-[#0077ff] pulse-glow" />
        <span className="text-[10px] tracking-[0.2em] text-[#00f0ff88]">ACTIVE TASKS</span>
        {tasks.length > 0 && (
          <span className="ml-auto text-[10px] text-[#00f0ff44]">{tasks.length}</span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
        {tasks.length === 0 ? (
          <div className="text-[11px] text-[#00f0ff33] text-center mt-8">No tasks yet</div>
        ) : (
          <AnimatePresence initial={false}>
            {tasks.map((task) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-start gap-2 text-[11px] border border-[#00f0ff18] rounded p-2"
              >
                <motion.span
                  className="shrink-0 font-bold"
                  style={{ color: STATUS_COLOR[task.status] }}
                  animate={task.status === 'running' ? { opacity: [1, 0.3, 1] } : {}}
                  transition={{ duration: 0.8, repeat: Infinity }}
                >
                  {STATUS_ICON[task.status]}
                </motion.span>
                <div className="flex-1 min-w-0">
                  <div className="text-[#00f0ffcc] break-words">{task.description}</div>
                  <div
                    className="text-[9px] tracking-widest mt-0.5 uppercase"
                    style={{ color: STATUS_COLOR[task.status] }}
                  >
                    {task.status}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
