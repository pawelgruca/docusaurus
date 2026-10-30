import type {ReactNode} from 'react';

const ROLE_SEPARATOR = /,\s*/;

export default function Access({roles}: {roles: string}): ReactNode {
  const roleList = roles.split(ROLE_SEPARATOR).filter(Boolean);

  return (
    <div className="access-roles">
      <span className="access-roles__label">🛡 Dostęp:</span>
      {roleList.map((role) => (
        <span key={role} className="access-roles__role">
          {role}
        </span>
      ))}
    </div>
  );
}
