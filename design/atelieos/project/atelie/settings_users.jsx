/* ============================================================
   settings_users.jsx — Configurações → Usuários e acessos
   Members · invites · role editing · permission matrix.
   Exposes window.SettingsUsers.
   ============================================================ */

const SEED_MEMBERS = [
  { id: 'u1', name: 'Camila Ribeiro', email: 'camila@instanteambar.com.br', role: 'owner', status: 'active', seen: 'Online agora' },
  { id: 'u2', name: 'Joana Alves', email: 'joana@instanteambar.com.br', role: 'admin', status: 'active', seen: 'há 2 horas' },
  { id: 'u3', name: 'Rafael Pinto', email: 'rafael@instanteambar.com.br', role: 'operator', status: 'active', seen: 'ontem, 18:40' },
  { id: 'u4', name: 'Marina Souza', email: 'marina@instanteambar.com.br', role: 'operator', status: 'suspended', seen: 'há 8 dias' },
];
const SEED_INVITES = [
  { id: 'i1', email: 'lucas@instanteambar.com.br', role: 'operator', when: 'há 1 dia' },
];

const PERM_MODULES = [
  { mod: 'Hoje no ateliê', icon: 'hoje', owner: 'full', admin: 'full', operator: 'full' },
  { mod: 'Pedidos', icon: 'pedidos', owner: 'full', admin: 'full', operator: 'full' },
  { mod: 'Produção', icon: 'producao', owner: 'full', admin: 'full', operator: 'full' },
  { mod: 'Estoque', icon: 'estoque', owner: 'full', admin: 'full', operator: 'full' },
  { mod: 'Itens / SKUs', icon: 'itens', owner: 'full', admin: 'full', operator: 'read' },
  { mod: 'Receitas', icon: 'receitas', owner: 'full', admin: 'full', operator: 'read' },
  { mod: 'Etiquetas', icon: 'tag', owner: 'full', admin: 'full', operator: 'full' },
  { mod: 'Conteúdo IA', icon: 'ia', owner: 'full', admin: 'full', operator: 'full' },
  { mod: 'Configurações', icon: 'settings', owner: 'full', admin: 'partial', operator: 'none' },
  { mod: 'Auditoria', icon: 'fileText', owner: 'full', admin: 'full', operator: 'none' },
];
const PERM_LABEL = { full: 'Total', partial: 'Parcial', read: 'Leitura', none: '—' };

function PermPill({ v }) {
  return <span className={cn('um-mx-pill', `um-mx-pill--${v}`)}>{PERM_LABEL[v]}</span>;
}

function StatusBadge({ status }) {
  if (status === 'active') return <Badge tone="ok" dot>Ativo</Badge>;
  if (status === 'suspended') return <Badge tone="neutral" dot>Suspenso</Badge>;
  return <Badge tone="warn" dot>Pendente</Badge>;
}

/* ---- row kebab menu ---- */
function MemberMenu({ member, onSuspend, onRemove, onClose }) {
  React.useEffect(() => {
    const h = () => onClose();
    document.addEventListener('click', h);
    return () => document.removeEventListener('click', h);
  }, []);
  return (
    <div className="um-menu" onClick={e => e.stopPropagation()}>
      <button className="um-menu-item" onClick={() => { onSuspend(); onClose(); }}>
        <Icon name={member.status === 'suspended' ? 'unlock' : 'lock'} size={15} />
        {member.status === 'suspended' ? 'Reativar acesso' : 'Suspender acesso'}
      </button>
      <div className="um-menu-sep" />
      <button className="um-menu-item um-menu-item--bad" onClick={() => { onRemove(); onClose(); }}>
        <Icon name="trash" size={15} /> Remover do ateliê
      </button>
    </div>
  );
}

/* ---- invite modal ---- */
function InviteModal({ open, onClose, onInvite }) {
  const [email, setEmail] = React.useState('');
  const [role, setRole] = React.useState('operator');
  const [msg, setMsg] = React.useState('');
  const [err, setErr] = React.useState(null);
  React.useEffect(() => { if (open) { setEmail(''); setRole('operator'); setMsg(''); setErr(null); } }, [open]);

  const submit = () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setErr('Digite um e-mail válido.');
    onInvite({ email: email.trim(), role });
    onClose();
  };
  return (
    <Modal open={open} onClose={onClose} title="Convidar pessoa" subtitle="Envie um convite por e-mail para entrar no ateliê" icon="user" width={520}
      footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><div className="spacer" /><Button variant="default" icon="arrowRight" onClick={submit}>Enviar convite</Button></>}>
      <Field label="E-mail" required error={err}>
        <Input icon="user" type="email" value={email} onChange={e => { setEmail(e.target.value); setErr(null); }} placeholder="email@daequipe.com" autoFocus />
      </Field>
      <Field label="Papel no ateliê" hint={ROLE_META[role].desc}>
        <Select value={role} onChange={setRole} options={ROLE_OPTS} />
      </Field>
      <Field label="Mensagem" hint="Opcional — aparece no e-mail de convite.">
        <Textarea value={msg} onChange={e => setMsg(e.target.value)} placeholder="Oi! Bora organizar a produção do ateliê por aqui." style={{ minHeight: 70 }} />
      </Field>
    </Modal>
  );
}

/* ---- confirm-remove modal ---- */
function RemoveModal({ member, onClose, onConfirm }) {
  if (!member) return null;
  return (
    <Modal open={!!member} onClose={onClose} title="Remover do ateliê" subtitle={member.name} icon="trash" width={460}
      footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><div className="spacer" /><Button variant="destructive" icon="trash" onClick={onConfirm}>Remover acesso</Button></>}>
      <p style={{ fontSize: 13.5, lineHeight: 1.6, margin: 0 }}>
        <strong>{member.name}</strong> ({member.email}) perderá o acesso ao ateliê imediatamente. O histórico de ações realizadas permanece registrado na auditoria.
      </p>
    </Modal>
  );
}

function SettingsUsers({ currentUser }) {
  const me = currentUser || { email: 'camila@instanteambar.com.br', role: 'owner' };
  const canManage = me.role === 'owner' || me.role === 'admin';

  const [members, setMembers] = React.useState(() => {
    try { const s = JSON.parse(localStorage.getItem('atelie-team')); if (s && s.length) return s; } catch (e) {}
    return SEED_MEMBERS;
  });
  const [invites, setInvites] = React.useState(() => {
    try {
      const base = JSON.parse(localStorage.getItem('atelie-invites'));
      if (base && base.length) return base;
    } catch (e) {}
    let extra = [];
    try {
      const onb = JSON.parse(localStorage.getItem('atelie-pending-invites'));
      if (onb && onb.length) extra = onb.map((x, i) => ({ id: 'ob' + i, email: x.email, role: x.role, when: 'agora' }));
    } catch (e) {}
    return [...SEED_INVITES, ...extra];
  });
  const [menuFor, setMenuFor] = React.useState(null);
  const [inviteOpen, setInviteOpen] = React.useState(false);
  const [removeTarget, setRemoveTarget] = React.useState(null);

  React.useEffect(() => { localStorage.setItem('atelie-team', JSON.stringify(members)); }, [members]);
  React.useEffect(() => { localStorage.setItem('atelie-invites', JSON.stringify(invites)); }, [invites]);

  const activeCount = members.filter(m => m.status === 'active').length;

  const setRole = (id, role) => {
    setMembers(list => list.map(m => m.id === id ? { ...m, role } : m));
    toast('Papel atualizado.', 'ok');
  };
  const toggleSuspend = (id) => {
    setMembers(list => list.map(m => m.id === id ? { ...m, status: m.status === 'suspended' ? 'active' : 'suspended' } : m));
  };
  const removeMember = () => {
    const m = removeTarget;
    setMembers(list => list.filter(x => x.id !== m.id));
    setRemoveTarget(null);
    toast(`${m.name.split(' ')[0]} removido do ateliê.`, 'info');
  };
  const addInvite = ({ email, role }) => {
    setInvites(list => [{ id: 'i' + Date.now(), email, role, when: 'agora' }, ...list]);
    toast('Convite enviado.', 'ok');
  };
  const resendInvite = (id) => toast('Convite reenviado.', 'info');
  const cancelInvite = (id) => { setInvites(list => list.filter(i => i.id !== id)); toast('Convite cancelado.', 'info'); };

  return (
    <div>
      <div className="um-head">
        <div>
          <div className="set-section-title">Usuários e acessos</div>
          <div className="set-section-lede" style={{ marginBottom: 0 }}>Gerencie quem entra no ateliê, seus papéis e o que cada pessoa pode fazer.</div>
        </div>
        {canManage && <Button variant="default" icon="plus" onClick={() => setInviteOpen(true)}>Convidar pessoa</Button>}
      </div>

      <div className="um-stats">
        <div className="um-stat"><div className="um-stat-v">{members.length}</div><div className="um-stat-l">Membros no ateliê</div></div>
        <div className="um-stat"><div className="um-stat-v">{activeCount}</div><div className="um-stat-l">Acessos ativos</div></div>
        <div className="um-stat"><div className="um-stat-v">{invites.length}</div><div className="um-stat-l">Convites pendentes</div></div>
      </div>

      {/* members */}
      <Card style={{ marginBottom: 'var(--gap)' }}>
        <CardHeader><CardTitle>Membros</CardTitle><span className="muted" style={{ fontSize: 12.5 }}>{members.length} pessoas</span></CardHeader>
        <CardContent style={{ paddingTop: 4 }}>
          {members.map(m => {
            const isMe = m.email === me.email;
            const isOwner = m.role === 'owner';
            return (
              <div className="um-member" key={m.id}>
                <Avatar name={m.name} size={40} />
                <div className="um-member-id">
                  <div className="um-member-name">{m.name}{isMe && <span className="um-you">você</span>}</div>
                  <div className="um-member-mail">{m.email}</div>
                </div>
                <div className="um-member-seen">{m.seen}</div>
                <StatusBadge status={m.status} />
                {(!canManage || isOwner) ? (
                  <span className="um-role-pill"><Icon name={ROLE_META[m.role].icon} size={14} className="muted" />{ROLE_META[m.role].label}</span>
                ) : (
                  <select className="om-input um-role-sel" value={m.role} onChange={e => setRole(m.id, e.target.value)}>
                    <option value="admin">Administrador(a)</option>
                    <option value="operator">Operador(a)</option>
                  </select>
                )}
                {canManage && !isOwner && !isMe ? (
                  <div className="um-menu-wrap">
                    <button className="icon-btn" onClick={(e) => { e.stopPropagation(); setMenuFor(menuFor === m.id ? null : m.id); }} title="Mais ações"><Icon name="more" size={18} /></button>
                    {menuFor === m.id && <MemberMenu member={m} onSuspend={() => toggleSuspend(m.id)} onRemove={() => setRemoveTarget(m)} onClose={() => setMenuFor(null)} />}
                  </div>
                ) : <div style={{ width: 36, flexShrink: 0 }} />}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* pending invites */}
      <Card style={{ marginBottom: 'var(--gap)' }}>
        <CardHeader><CardTitle>Convites pendentes</CardTitle><span className="muted" style={{ fontSize: 12.5 }}>{invites.length} aguardando</span></CardHeader>
        <CardContent style={{ paddingTop: 4 }}>
          {invites.length === 0 ? (
            <Empty icon="inbox" title="Nenhum convite pendente" hint="Convide pessoas para colaborar na operação do ateliê." />
          ) : invites.map(inv => (
            <div className="um-invite" key={inv.id}>
              <div className="um-invite-ico"><Icon name="user" size={17} /></div>
              <div className="um-invite-id">
                <div className="um-invite-mail">{inv.email}</div>
                <div className="um-invite-sub">{ROLE_META[inv.role].label} · convidado {inv.when}</div>
              </div>
              <Badge tone="warn" dot>Pendente</Badge>
              {canManage && (
                <div className="row" style={{ gap: 6 }}>
                  <Button variant="ghost" size="sm" icon="refresh" onClick={() => resendInvite(inv.id)}>Reenviar</Button>
                  <Button variant="ghost" size="sm" icon="x" onClick={() => cancelInvite(inv.id)}>Cancelar</Button>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* permission matrix (read-only) */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Papéis e permissões</CardTitle>
            <div className="muted" style={{ fontSize: 12.5, marginTop: 3 }}>O que cada papel pode acessar. Definido pelo sistema.</div>
          </div>
        </CardHeader>
        <CardContent style={{ paddingTop: 12 }}>
          <div className="um-matrix-scroll">
            <table className="um-matrix">
              <thead>
                <tr>
                  <th>Módulo</th>
                  {['owner', 'admin', 'operator'].map(r => (
                    <th key={r} className="um-mx-role"><span className="um-mx-role-head"><Icon name={ROLE_META[r].icon} size={13} />{ROLE_META[r].short}</span></th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PERM_MODULES.map(row => (
                  <tr key={row.mod}>
                    <td><span className="um-mx-mod">{row.mod}</span></td>
                    <td className="um-mx-cell"><PermPill v={row.owner} /></td>
                    <td className="um-mx-cell"><PermPill v={row.admin} /></td>
                    <td className="um-mx-cell"><PermPill v={row.operator} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="row" style={{ gap: 16, marginTop: 14, flexWrap: 'wrap' }}>
            {[['full', 'Acesso total'], ['partial', 'Acesso parcial'], ['read', 'Somente leitura'], ['none', 'Sem acesso']].map(([v, lbl]) => (
              <div className="row" key={v} style={{ gap: 7 }}><PermPill v={v} /><span className="muted" style={{ fontSize: 12 }}>{lbl}</span></div>
            ))}
          </div>
        </CardContent>
      </Card>

      <InviteModal open={inviteOpen} onClose={() => setInviteOpen(false)} onInvite={addInvite} />
      <RemoveModal member={removeTarget} onClose={() => setRemoveTarget(null)} onConfirm={removeMember} />
    </div>
  );
}

window.SettingsUsers = SettingsUsers;
