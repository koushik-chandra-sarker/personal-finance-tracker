import { prisma } from '@/lib/prisma';
import { Feature, AccessLevel } from '@prisma/client';

export async function inviteCollaborator(ownerId: string, email: string) {
  const collaborator = await prisma.user.findUnique({ where: { email } });
  if (!collaborator) throw new Error('User not found. They must sign up first.');
  if (collaborator.id === ownerId) throw new Error('You cannot invite yourself.');

  const existingShare = await prisma.sharedAccess.findFirst({
    where: { ownerId, collaboratorId: collaborator.id }
  });

  if (existingShare) throw new Error('User is already a collaborator.');

  const features = Object.values(Feature);
  
  // Create shared access with default NONE permissions for all features
  const sharedAccess = await prisma.sharedAccess.create({
    data: {
      ownerId,
      collaboratorId: collaborator.id,
      permissions: {
        create: features.map(feature => ({
          feature,
          accessLevel: 'NONE'
        }))
      }
    },
    include: {
      collaborator: {
        select: { id: true, name: true, email: true }
      },
      permissions: true
    }
  });

  return sharedAccess;
}

export async function updateFeatureAccess(ownerId: string, sharedAccessId: string, feature: Feature, accessLevel: AccessLevel) {
  const sharedAccess = await prisma.sharedAccess.findUnique({
    where: { id: sharedAccessId, ownerId }
  });
  
  if (!sharedAccess) throw new Error('Shared access not found or unauthorized.');

  return prisma.featureAccess.upsert({
    where: {
      sharedAccessId_feature: {
        sharedAccessId,
        feature
      }
    },
    update: { accessLevel },
    create: {
      sharedAccessId,
      feature,
      accessLevel
    }
  });
}

export async function removeCollaborator(ownerId: string, sharedAccessId: string) {
  const sharedAccess = await prisma.sharedAccess.findUnique({
    where: { id: sharedAccessId, ownerId }
  });
  if (!sharedAccess) throw new Error('Shared access not found or unauthorized.');

  await prisma.sharedAccess.delete({ where: { id: sharedAccessId } });
  return true;
}

export async function getCollaborators(ownerId: string) {
  return prisma.sharedAccess.findMany({
    where: { ownerId },
    include: {
      collaborator: {
        select: { id: true, name: true, email: true }
      },
      permissions: true
    }
  });
}

export async function getAccessibleWorkspaces(collaboratorId: string) {
  return prisma.sharedAccess.findMany({
    where: { collaboratorId },
    include: {
      owner: {
        select: { id: true, name: true, email: true }
      },
      permissions: true
    }
  });
}
