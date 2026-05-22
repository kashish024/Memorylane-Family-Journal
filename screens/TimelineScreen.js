import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Alert, Image, TextInput, ActivityIndicator, StatusBar } from 'react-native';
import { ArrowLeft, Clock, Trash2, Filter,Mic, Play, Pause } from 'lucide-react-native';
import { Search, X, SlidersHorizontal } from 'lucide-react-native';
import { useState, useEffect } from 'react';
import { loadMemories, deleteMemory, loadChildren, getMemoriesForChild } from '../utils/storage';
import { formatDate, getRelativeTime } from '../utils/dateHelper';
import { playAudio, pauseAudio, stopAudio, formatDuration } from '../utils/audioHelper';
import { Pencil} from 'lucide-react-native';
import { auth, db } from '../utils/firebase';
import { doc, getDoc } from 'firebase/firestore';
import ChildAvatar from '../components/ChildAvatar';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SELECTED_CHILD_ID_KEY = '@selectedChildId';

// Cache for author names to avoid repeated lookups
const authorNameCache = {};

// Fetch author info from users collection (returns object with name and email)
const fetchAuthorInfo = async (authorId) => {
  if (!authorId) return { name: 'Unknown', email: null };
  
  // Check cache first
  if (authorNameCache[authorId]) {
    return authorNameCache[authorId];
  }
  
  try {
    const userDoc = await getDoc(doc(db, 'users', authorId));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      const info = {
        name: userData.name || null,
        email: userData.email || null,
      };
      authorNameCache[authorId] = info;
      return info;
    }
    return { name: 'Unknown', email: null };
  } catch (error) {
    console.error('Error fetching author info:', error);
    return { name: 'Unknown', email: null };
  }
};

const getAuthorLabel = (memory, authorInfoCache = {}, childOwnerId = null) => {
  const currentUserId = auth.currentUser?.uid;
  
  // If no authorId, check for old format (memory.author)
  if (!memory.authorId) {
    if (memory.author) {
      return `by ${memory.author}`;
    }
    return null;
  }
  
  // Compare authorId with current user ID (ensure both are strings for comparison)
  const memoryAuthorId = String(memory.authorId || '').trim();
  const userId = String(currentUserId || '').trim();
  
  // Only show "by You" if the IDs actually match
  if (memoryAuthorId === userId && userId !== '' && memoryAuthorId !== '') {
    return 'by You';
  }
  
  // Check if author is the owner of the child
  if (childOwnerId && String(memoryAuthorId) === String(childOwnerId)) {
    return 'by Owner';
  }
  
  // Get author info from cache (includes name and email)
  const authorInfo = authorInfoCache[memory.id] || { name: memory.authorName, email: null };
  
  // Determine what to display
  let displayName = authorInfo.name;
  
  // If name is "You", "Unknown", or empty, try email
  if (!displayName || displayName === 'You' || displayName === 'Unknown') {
    if (authorInfo.email) {
      displayName = authorInfo.email;
    } else if (memory.authorName && memory.authorName !== 'You') {
      displayName = memory.authorName;
    } else {
      displayName = 'Unknown';
    }
  }
  
  return `by ${displayName}`;
};

export default function TimelineScreen({ navigation }) {
  console.log('📅 Timeline: Component rendered');
  const [memories, setMemories] = useState([]);
  const [filteredMemories, setFilteredMemories] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all', 'milestones', 'recent'
  const [playingAudioId, setPlayingAudioId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date-desc'); // 'date-desc', 'date-asc', 'type'
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [loading, setLoading] = useState(false);
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [authorInfoCache, setAuthorInfoCache] = useState({}); // Cache for fetched author info (name + email)

  useEffect(() => {
    console.log('📅 Timeline: useEffect triggered - initial load');
    loadData();
    
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('📅 Timeline: Screen focused, reloading data');
      loadData();
    });
    
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    applyFilter();
  }, [memories, filter]);

  const loadData = async () => {
    setLoading(true);
    try {
      console.log('📅 Timeline: Loading children...');
      const childrenData = await loadChildren();
      setChildren(childrenData);
      
      console.log('📅 Timeline: Children loaded:', childrenData.length);
      console.log('📅 Timeline: Children:', childrenData.map(c => ({ id: c.id, name: c.name })));
      
      if (childrenData && childrenData.length > 0) {
        let childToSelect = null;
        
        // First, try to get selected child from AsyncStorage (set by HomeScreen)
        try {
          const storedChildId = await AsyncStorage.getItem(SELECTED_CHILD_ID_KEY);
          if (storedChildId) {
            const storedChild = childrenData.find(c => c.id === storedChildId);
            if (storedChild) {
              childToSelect = storedChild;
              console.log('📅 Timeline: Using stored child from AsyncStorage:', storedChild.name);
            }
          }
        } catch (error) {
          console.error('Error reading selected child from storage:', error);
        }
        
        // If no stored child, check if current selectedChild still exists
        if (!childToSelect) {
          const currentChildExists = selectedChild && 
            childrenData.some(child => child.id === selectedChild.id);
          
          if (currentChildExists) {
            childToSelect = selectedChild;
            console.log('📅 Timeline: Using current selected child:', childToSelect.name);
          }
        }
        
        // Fallback to first child if nothing else found
        if (!childToSelect) {
          childToSelect = childrenData[0];
          console.log('📅 Timeline: Using first child as fallback:', childToSelect.name);
        }
        
        setSelectedChild(childToSelect);
        
        // Store selected child ID in AsyncStorage
        try {
          await AsyncStorage.setItem(SELECTED_CHILD_ID_KEY, childToSelect.id);
        } catch (error) {
          console.error('Error storing selected child:', error);
        }
        
        console.log('📅 Timeline: Selected child:', childToSelect.name, 'ID:', childToSelect.id);
        
        if (childToSelect) {
          console.log('📅 Timeline: Loading memories for child ID:', childToSelect.id);
          const allMemories = await getMemoriesForChild(childToSelect.id);
          console.log('📅 Timeline: Memories loaded:', allMemories.length);
          console.log('📅 Timeline: Memory IDs:', allMemories.map(m => ({ id: m.id, childId: m.childId, title: m.title })));
          
          // Fetch author info for all memories where we need it
          const currentUserId = auth.currentUser?.uid;
          const authorInfoPromises = allMemories
            .filter(m => m.authorId && (
              // Fetch if authorName is "You" but authorId doesn't match current user
              (m.authorName === 'You' && String(m.authorId) !== String(currentUserId)) ||
              // Or if authorName is missing/Unknown
              !m.authorName || m.authorName === 'Unknown'
            ))
            .map(async (memory) => {
              const info = await fetchAuthorInfo(memory.authorId);
              return { memoryId: memory.id, authorId: memory.authorId, info };
            });
          
          const fetchedInfo = await Promise.all(authorInfoPromises);
          const infoMap = {};
          fetchedInfo.forEach(({ memoryId, info }) => {
            infoMap[memoryId] = info;
          });
          
          // Update memories with fetched author names (prefer name, fallback to email)
          const enrichedMemories = allMemories.map(memory => {
            if (infoMap[memory.id]) {
              const authorName = infoMap[memory.id].name || infoMap[memory.id].email || memory.authorName;
              return { ...memory, authorName: authorName };
            }
            return memory;
          });
          
          setAuthorInfoCache(infoMap);
          setMemories(enrichedMemories);
          setFilteredMemories(enrichedMemories);
        }
      } else {
        console.log('📅 Timeline: No children found');
        setSelectedChild(null);
        setMemories([]);
        setFilteredMemories([]);
      }
    } catch (error) {
      console.error('📅 Timeline: Error loading data:', error);
      console.error('📅 Timeline: Error message:', error.message);
      Alert.alert('Error', 'Failed to load timeline data.');
    } finally {
      setLoading(false);
    }
  };

  const applyFilter = () => {
    let filtered = [...memories];
    
    if (filter === 'milestones') {
      filtered = filtered.filter(m => m.milestone);
    } else if (filter === 'recent') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      filtered = filtered.filter(m => new Date(m.date) >= sevenDaysAgo);
    }
    
    setFilteredMemories(filtered);
  };

  const searchAndSort = () => {
    try {
      let results = [...filteredMemories];

      // Apply search (guard against null/undefined/non-string from Firestore)
      if (searchQuery.trim()) {
        const query = String(searchQuery).toLowerCase();
        results = results.filter(m => {
          const title = m.title != null ? String(m.title) : '';
          const content = m.content != null ? String(m.content) : '';
          const author = m.author != null ? String(m.author) : '';
          const milestone = m.milestone != null ? String(m.milestone) : '';
          return (
            title.toLowerCase().includes(query) ||
            content.toLowerCase().includes(query) ||
            author.toLowerCase().includes(query) ||
            milestone.toLowerCase().includes(query)
          );
        });
      }

      // Apply sort (guard against missing type/date in production data)
      switch (sortBy) {
        case 'date-desc':
          results.sort((a, b) => (new Date(b.date) || 0) - (new Date(a.date) || 0));
          break;
        case 'date-asc':
          results.sort((a, b) => (new Date(a.date) || 0) - (new Date(b.date) || 0));
          break;
        case 'type':
          results.sort((a, b) => (String(a.type || '')).localeCompare(String(b.type || '')));
          break;
      }

      return results;
    } catch (err) {
      console.error('Timeline search/sort error:', err);
      return filteredMemories;
    }
  };

  const displayedMemories = searchAndSort();

  const handlePlayAudio = async (memory) => {
    try {
      console.log('🎵 handlePlayAudio called');
      console.log('🎵 Memory object:', JSON.stringify(memory, null, 2));
      console.log('🎵 memory.audioUrl:', memory.audioUrl);
      console.log('🎵 memory.audioUri:', memory.audioUri);
      
      if (playingAudioId === memory.id) {
        await pauseAudio();
        setPlayingAudioId(null);
      } else {
        if (playingAudioId) {
          await stopAudio();
        }
        
        // Use audioUrl (cloud) if available, fallback to audioUri (local)
        const audioSource = memory.audioUrl || memory.audioUri;
        
        console.log('🎵 Audio source to play:', audioSource);
        console.log('🎵 Audio source type:', typeof audioSource);
        
        if (!audioSource) {
          console.error('🎵 No audio source found!');
          Alert.alert('Error', 'Audio file not found');
          return;
        }
        
        console.log('🎵 Attempting to play audio...');
        await playAudio(audioSource);
        console.log('🎵 Audio started playing');
        setPlayingAudioId(memory.id);
      }
    } catch (error) {
      console.error('🎵 Audio playback error:', error);
      console.error('🎵 Error message:', error.message);
      Alert.alert('Error', 'Failed to play audio: ' + error.message);
    }
  };

  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, []);


  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleDelete = (memory) => {
    const title = memory?.title != null ? String(memory.title) : 'this memory';
    Alert.alert(
      'Delete Memory?',
      `Are you sure you want to delete "${title}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const success = await deleteMemory(memory.id);
            if (success) {
              await loadData();
            } else {
              Alert.alert('Error', 'Failed to delete memory');
            }
          }
        }
      ]
    );
  };

  const highlightText = (text, query) => {
    if (!query.trim()) return text;
    
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, index) => 
      part.toLowerCase() === query.toLowerCase() ? (
        <Text key={`highlight-${index}-${part.substring(0, 10)}`} className="bg-yellow-200 font-bold">{part}</Text>
      ) : (
        <Text key={`text-${index}-${part.substring(0, 10)}`}>{part}</Text>
      )
    );
  };

  return (
    <View className="flex-1 bg-background">
      <StatusBar barStyle="light-content" translucent={true} backgroundColor="transparent" />
        {/* Header */}
        <View className="bg-primary pb-4">
          <View className="p-4 flex-row items-start" style={{ paddingTop: 70 }}>
            <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3" style={{ marginTop: 2 }}>
              <ArrowLeft size={24} color="white" />
            </TouchableOpacity>
            <View className="flex-1">
              <Text className="text-xl font-bold text-white">
                {selectedChild ? `${selectedChild.name}'s Timeline` : 'Timeline'}
              </Text>
              <Text className="text-sm text-primary/10">
                {displayedMemories.length} {displayedMemories.length === 1 ? 'memory' : 'memories'}
              </Text>
            </View>
            <TouchableOpacity 
              onPress={() => setShowSortMenu(!showSortMenu)}
              className="bg-primary-light p-2 rounded-lg"
            >
              <SlidersHorizontal size={20} color="white" />
            </TouchableOpacity>
          </View>

          {/* Child Selector - Add this after line 264, before Search Bar */}
          {children.length > 1 && (
            <View className="px-4 mb-3">
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row gap-2">
                  {children.map((child) => (
                    <TouchableOpacity
                      key={child.id}
                      className={`px-4 py-2 rounded-full ${
                        selectedChild?.id === child.id
                          ? 'bg-white'
                          : 'bg-primary-light'
                      }`}
                      onPress={async () => {
                        setSelectedChild(child);
                        // Store selected child ID in AsyncStorage
                        try {
                          await AsyncStorage.setItem(SELECTED_CHILD_ID_KEY, child.id);
                        } catch (error) {
                          console.error('Error storing selected child:', error);
                        }
                        setLoading(true);
                        const childMemories = await getMemoriesForChild(child.id);
                        setMemories(childMemories);
                        setFilteredMemories(childMemories);
                        setLoading(false);
                      }}
                    >
                      <View className="flex-row items-center">
                        <ChildAvatar
                          avatar={child.avatar}
                          avatarPhotoUrl={child.avatarPhotoUrl}
                          size={24}
                          style={{ marginRight: 8 }}
                        />
                      <Text className={`font-semibold ${
                        selectedChild?.id === child.id
                          ? 'text-primary'
                          : 'text-white'
                      }`}>
                          {child.name}
                      </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}
        {/* Search Bar */}
        <View className="px-2 mb-0">
          <View className="flex-row items-center bg-white rounded-xl px-3 py-2">
            <Search size={20} color="#9ca3af" />
            <TextInput
              className="flex-1 ml-2 text-gray-800"
              placeholder="Search memories..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#9ca3af"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X size={20} color="#9ca3af" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Sort Menu */}
        {showSortMenu && (
          <View className="mx-4 bg-white rounded-xl p-2 shadow-lg">
            <TouchableOpacity
              className={`p-3 rounded-lg ${sortBy === 'date-desc' ? 'bg-primary/10' : ''}`}
              onPress={() => {
                setSortBy('date-desc');
                setShowSortMenu(false);
              }}
            >
              <Text className={`font-semibold ${sortBy === 'date-desc' ? 'text-primary' : 'text-gray-700'}`}>
                Newest First
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`p-3 rounded-lg ${sortBy === 'date-asc' ? 'bg-primary/10' : ''}`}
              onPress={() => {
                setSortBy('date-asc');
                setShowSortMenu(false);
              }}
            >
              <Text className={`font-semibold ${sortBy === 'date-asc' ? 'text-primary' : 'text-gray-700'}`}>
                Oldest First
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`p-3 rounded-lg ${sortBy === 'type' ? 'bg-primary/10' : ''}`}
              onPress={() => {
                setSortBy('type');
                setShowSortMenu(false);
              }}
            >
              <Text className={`font-semibold ${sortBy === 'type' ? 'text-primary' : 'text-gray-700'}`}>
                By Type
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Filter Buttons */}
        <View className="flex-row gap-2 px-4 mt-3">
          <TouchableOpacity
            className={`flex-1 py-2 px-4 rounded-lg ${
              filter === 'all' ? 'bg-white' : 'bg-primary-light'
            }`}
            onPress={() => setFilter('all')}
          >
            <Text className={`text-center font-semibold ${
              filter === 'all' ? 'text-primary' : 'text-white'
            }`}>
              All ({memories.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`flex-1 py-2 px-4 rounded-lg ${
              filter === 'milestones' ? 'bg-white' : 'bg-primary-light'
            }`}
            onPress={() => setFilter('milestones')}
          >
            <Text className={`text-center font-semibold ${
              filter === 'milestones' ? 'text-primary' : 'text-white'
            }`}>
              Milestones ({memories.filter(m => m.milestone).length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`flex-1 py-2 px-4 rounded-lg ${
              filter === 'recent' ? 'bg-white' : 'bg-primary-light'
            }`}
            onPress={() => setFilter('recent')}
          >
            <Text className={`text-center font-semibold ${
              filter === 'recent' ? 'text-primary' : 'text-white'
            }`}>
              Recent
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        className="flex-1 p-6"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading ? (
    // Loading State
    <View className="flex-1 items-center justify-center py-20">
      <ActivityIndicator size="large" color="#E07A5F" />
      <Text className="text-gray-600 mt-4">Loading memories...</Text>
    </View>
  ) : displayedMemories.length === 0 ? (
    <View className="items-center justify-center py-20 px-6">
      <View className="bg-primary/10 w-32 h-32 rounded-full items-center justify-center mb-6">
        <Text className="text-7xl">
          {searchQuery ? '🔍' : filter === 'milestones' ? '🎉' : filter === 'recent' ? '📅' : '📖'}
        </Text>
      </View>
      
      <Text className="text-2xl font-bold text-gray-800 mb-3 text-center">
        {searchQuery 
          ? 'No matches found'
          : filter === 'milestones' ? 'No milestones yet'
          : filter === 'recent' ? 'No recent memories'
          : 'No memories yet'
        }
      </Text>
      
      <Text className="text-gray-600 text-center mb-6 leading-relaxed px-4">
        {searchQuery 
          ? `We couldn't find any memories matching "${searchQuery}". Try a different search term or browse all memories.`
          : filter === 'all' 
            ? `Start capturing precious moments with ${selectedChild?.name}. Every memory counts!`
            : 'Try a different filter or add more memories to see them here.'
        }
      </Text>
      
      {searchQuery && (
        <TouchableOpacity 
          className="bg-primary/10 px-6 py-3 rounded-full mb-4"
          onPress={() => setSearchQuery('')}
        >
          <Text className="text-primary font-semibold">Clear Search</Text>
        </TouchableOpacity>
      )}
      
      {filter === 'all' && !searchQuery && (
        <TouchableOpacity 
          className="bg-primary px-8 py-4 rounded-full shadow-lg"
          onPress={() => navigation.navigate('AddMemory', { childId: selectedChild?.id })}
        >
          <Text className="text-white font-bold text-lg">Add First Memory</Text>
        </TouchableOpacity>
      )}
    </View>
  ) : (
          displayedMemories.map((memory, index) => (
            <View key={`${memory.id}-${index}`} className="relative mb-6">
              {/* Timeline line */}
              {index < displayedMemories.length - 1 && (
                <View className="absolute left-6 top-16 bottom-0 w-0.5 bg-primary/20" />
              )}
              
              <View className="flex-row gap-4">
                {/* Timeline dot */}
                <View className="w-12 h-12 rounded-full bg-primary items-center justify-center z-10">
                  <Text className="text-2xl">
                    {memory.milestone ? '🎉' : (memory.type === 'photo') ? '📷' : '✍️'}
                  </Text>
                </View>
                
                {/* Memory card */}
                <View className="flex-1 bg-white rounded-2xl shadow-lg overflow-hidden">
                  {/* Photo if exists */}
                  {memory.photoUrl ? (
                    <TouchableOpacity
                      onPress={() => navigation.navigate('PhotoView', { 
                        photoUri: memory.photoUrl  // Use photoUrl instead of photoUri
                      })}
                    >
                      <Image
                        source={{ uri: memory.photoUrl }}  // Use photoUrl
                        className="w-full h-48 rounded-xl mb-3"
                        resizeMode="cover"
                      />
                    </TouchableOpacity>
                  ) : memory.photoUri ? (  // Fallback to old photoUri for existing memories
                    <TouchableOpacity
                      onPress={() => navigation.navigate('PhotoView', { 
                        photoUri: memory.photoUri 
                      })}
                    >
                      <Image
                        source={{ uri: memory.photoUri }}
                        className="w-full h-48 rounded-xl mb-3"
                        resizeMode="cover"
                      />
                    </TouchableOpacity>
                  ) : null}

                  {/* Audio player if exists */}
                  {memory.audioUrl || memory.audioUri ? (
                  <View className="bg-primary/5 border-2 border-primary/20 rounded-xl p-4 mb-3">
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center flex-1">
                        <View className="w-10 h-10 bg-primary rounded-full items-center justify-center mr-3">
                          <Mic size={20} color="white" />
                        </View>
                        <View className="flex-1">
                          <Text className="font-semibold text-gray-800">Voice Recording</Text>
                          <Text className="text-xs text-gray-500">
                            {formatDuration(memory.audioDuration || 0)}
                          </Text>
                        </View>
                      </View>
                      <TouchableOpacity
                        className="bg-primary w-10 h-10 rounded-full items-center justify-center"
                        onPress={() => handlePlayAudio(memory)}
                      >
                        {playingAudioId === memory.id ? (
                          <Pause size={16} color="white" fill="white" />
                        ) : (
                          <Play size={16} color="white" fill="white" />
                        )}
                      </TouchableOpacity>
                    </View>
                    
                    {/* Show Transcript if available */}
                    {memory.transcript && (
                      <View className="bg-white rounded-lg p-3 mt-3">
                        <Text className="text-xs text-gray-500 mb-1">Transcript:</Text>
                        <Text className="text-gray-800 text-sm">{memory.transcript}</Text>
                      </View>
                    )}
                  </View>
                ) : null}
                  
                  <View className="p-5">
                    {memory.milestone != null && String(memory.milestone) !== '' && (
                      <View className="bg-gradient-to-r from-yellow-400 to-orange-400 self-start px-3 py-1 rounded-full mb-2">
                        <Text className="text-xs font-bold text-white">
                          {String(memory.milestone)}
                        </Text>
                      </View>
                    )}
                    <Text className="text-lg font-bold text-gray-800 mb-2">
                      {memory.title != null ? String(memory.title) : ''}
                    </Text>
                    <Text className="text-gray-600 mb-3 leading-relaxed">
                      {memory.content != null ? String(memory.content) : ''}
                    </Text>
                    
                    <View className="flex-row items-center justify-between border-t border-gray-100 pt-3">
                      <View className="flex-1">
                        <View className="flex-row items-center justify-between mb-1">
                          <View className="flex-row items-center">
                            <Clock size={12} color="#9ca3af" />
                            <Text className="text-xs text-gray-500 ml-1">
                              {formatDate(memory.date)}
                            </Text>
                          </View>
                          {/* Author Label */}
                          {(() => {
                            const authorLabel = getAuthorLabel(memory, authorInfoCache, selectedChild?.ownerId);
                            if (!authorLabel) {
                              // Fallback for old memories with memory.author
                              if (memory.author) {
                                return (
                                  <Text className="text-xs text-primary font-medium">
                                    by {memory.author}
                                  </Text>
                                );
                              }
                              return null;
                            }
                            const currentUserId = auth.currentUser?.uid;
                            // Ensure proper comparison by converting to strings
                            const memoryAuthorId = String(memory.authorId || '');
                            const userId = String(currentUserId || '');
                            const isYou = memoryAuthorId === userId && userId !== '';
                            const isOwner = selectedChild?.ownerId && String(memoryAuthorId) === String(selectedChild.ownerId);
                            return (
                              <View style={{
                                backgroundColor: isYou ? '#E8F5E9' : isOwner ? '#FFF3E0' : '#F8F9FA',
                                paddingHorizontal: 10,
                                paddingVertical: 4,
                                borderRadius: 12,
                              }}>
                                <Text style={{
                                  fontSize: 12,
                                  color: isYou ? '#87C38F' : isOwner ? '#E07A5F' : '#636E72',
                                  fontWeight: '500',
                                }}>
                                  {authorLabel}
                                </Text>
                              </View>
                            );
                          })()}
                        </View>
                      </View>

                      {/* Edit and Delete Buttons - Only show if user is owner or author */}
                      {(() => {
                        const currentUserId = auth.currentUser?.uid;
                        const isOwner = selectedChild?.ownerId === currentUserId;
                        const isAuthor = memory.authorId === currentUserId;
                        const canEditOrDelete = isOwner || isAuthor;
                        
                        if (!canEditOrDelete) {
                          return null;
                        }
                        
                        return (
                          <>
                      {/* Edit Button */}
  <TouchableOpacity
    style={{
      backgroundColor: '#87C38F',
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    }}
    onPress={() => navigation.navigate('EditMemory', { memory })}
  >
    <Pencil size={18} color="white" />
  </TouchableOpacity>

                            {/* Delete Button */}
                      <TouchableOpacity
                        className="bg-red-50 p-2 rounded-lg"
                        onPress={() => handleDelete(memory)}
                      >
                        <Trash2 size={18} color="#ef4444" />
                      </TouchableOpacity>
                          </>
                        );
                      })()}
                    </View>
                  </View>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}